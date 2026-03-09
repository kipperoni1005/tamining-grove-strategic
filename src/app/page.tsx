"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSettings } from "@/lib/api";
import { daysSince } from "@/lib/calc";
import type { Batch, Sale, Settings, Field, FieldCostEntry } from "@/lib/types";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BUYER_TYPES = ["Miller", "Broker", "Direct"];

export default function Dashboard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [costs, setCosts] = useState<FieldCostEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);

        const [{ data: f }, { data: b }, { data: sa }, { data: c }] = await Promise.all([
          supabase.from("fields").select("*").order("name"),
          supabase.from("batches").select("*").order("harvest_date", { ascending: false }),
          supabase.from("sales").select("*").order("sale_date", { ascending: false }),
          supabase.from("field_cost_entries").select("*").order("cost_date", { ascending: false }),
        ]);

        setFields((f ?? []) as Field[]);
        setBatches((b ?? []) as Batch[]);
        setSales((sa ?? []) as Sale[]);
        setCosts((c ?? []) as FieldCostEntry[]);
      } catch (e: any) {
        setError(e.message ?? "Failed to load data. Are you signed in?");
      }
    })();
  }, []);

  const kpis = useMemo(() => {
    const storedKg = batches.reduce((s, b) => s + Number(b.weight_stored_kg || 0), 0);
    const soldKg = sales.reduce((s, x) => s + Number(x.amount_sold_kg || 0), 0);
    const stockKg = storedKg - soldKg;

    const salesKes = sales.reduce((s, x) => s + Number(x.sale_value_kes || 0), 0);
    const saleCostsKes = sales.reduce((s, x) => s + Number(x.total_costs_kes || 0), 0);
    const productionCostsKes = costs.reduce((s, x) => s + Number(x.amount_kes || 0), 0);

    const breakEven = storedKg > 0 ? (productionCostsKes / storedKg) : 0;
    const netProfitKes = salesKes - (saleCostsKes + productionCostsKes);

    const acres = fields.reduce((s, f) => s + Number(f.size_acres || 0), 0);
    const yieldPerAcre = acres > 0 ? storedKg / acres : 0;

    const old60 = batches.filter(b => daysSince(b.harvest_date) >= 60).length;
    const old90 = batches.filter(b => daysSince(b.harvest_date) >= 90).length;

    const avgPrice = soldKg > 0 ? salesKes / soldKg : 0;

    const costPerKg = breakEven; // production cost per kg
    const netMarginPerKg = soldKg > 0 ? netProfitKes / soldKg : 0;

    return { storedKg, soldKg, stockKg, salesKes, saleCostsKes, productionCostsKes, breakEven, netProfitKes, acres, yieldPerAcre, old60, old90, avgPrice, costPerKg, netMarginPerKg };
  }, [batches, sales, costs, fields]);

  const buyerAnalytics = useMemo(() => {
    // Allocate production cost per kg using break-even cost/kg
    const prodCostPerKg = kpis.costPerKg || 0;

    const agg: Record<string, { qty: number; sales: number; saleCosts: number; prodAlloc: number; netMargin: number; avgPrice: number; netMarginPerKg: number; }> = {};
    for (const t of BUYER_TYPES) agg[t] = { qty:0, sales:0, saleCosts:0, prodAlloc:0, netMargin:0, avgPrice:0, netMarginPerKg:0 };

    for (const s of sales) {
      const t = (s.buyer_type || "Broker") as string;
      if (!agg[t]) agg[t] = { qty:0, sales:0, saleCosts:0, prodAlloc:0, netMargin:0, avgPrice:0, netMarginPerKg:0 };
      const qty = Number(s.amount_sold_kg || 0);
      const salesKes = Number(s.sale_value_kes || 0);
      const saleCosts = Number(s.total_costs_kes || 0);
      const prodAlloc = qty * prodCostPerKg;
      const netMargin = salesKes - saleCosts - prodAlloc;

      agg[t].qty += qty;
      agg[t].sales += salesKes;
      agg[t].saleCosts += saleCosts;
      agg[t].prodAlloc += prodAlloc;
      agg[t].netMargin += netMargin;
    }

    for (const t of Object.keys(agg)) {
      const a = agg[t];
      a.avgPrice = a.qty > 0 ? a.sales / a.qty : 0;
      a.netMarginPerKg = a.qty > 0 ? a.netMargin / a.qty : 0;
    }

    return agg;
  }, [sales, kpis.costPerKg]);

  const barData = useMemo(() => {
    const labels = Object.keys(buyerAnalytics);
    return {
      labels,
      datasets: [
        { label: "Avg price (KES/kg)", data: labels.map(l => buyerAnalytics[l].avgPrice) },
        { label: "Net margin (KES/kg)", data: labels.map(l => buyerAnalytics[l].netMarginPerKg) },
      ]
    };
  }, [buyerAnalytics]);

  return (
    <div className="grid" style={{gap: 16}}>
      <div className="card">
        <h1>{settings?.company_name ?? "Tamining Grove Limited"} — Strategic Dashboard</h1>
        <p className="small">
          Break-even + Buyer analytics + Cash flow • Sell window 1–3 months (alerts at 60/90 days).
        </p>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="grid grid4">
        <div className="card"><div className="small">Current Stock (kg)</div><div className="kpi">{kpis.stockKg.toFixed(1)}</div></div>
        <div className="card"><div className="small">Total Sales (KES)</div><div className="kpi">{kpis.salesKes.toFixed(0)}</div></div>
        <div className="card"><div className="small">Net Profit (KES)</div><div className="kpi">{kpis.netProfitKes.toFixed(0)}</div></div>
        <div className="card"><div className="small">Break-even (KES/kg)</div><div className="kpi">{kpis.breakEven.toFixed(2)}</div></div>

        <div className="card"><div className="small">Avg selling price (KES/kg)</div><div className="kpi">{kpis.avgPrice.toFixed(2)}</div></div>
        <div className="card"><div className="small">Net margin (KES/kg)</div><div className="kpi">{kpis.netMarginPerKg.toFixed(2)}</div></div>
        <div className="card"><div className="small">Yield (kg/acre)</div><div className="kpi">{kpis.yieldPerAcre.toFixed(1)}</div></div>
        <div className="card">
          <div className="small">Stock aging</div>
          <div className="row">
            <div><span className={kpis.old60 ? "badge warn":"badge"}>≥60d: {kpis.old60}</span></div>
            <div><span className={kpis.old90 ? "badge danger":"badge"}>≥90d: {kpis.old90}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid2">
        <div className="card">
          <h2>Buyer analytics</h2>
          <p className="small">Net margin uses allocated production cost = break-even × quantity sold.</p>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: true } } }} />
        </div>
        <div className="card">
          <h2>Buyer summary</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead>
                <tr>
                  <th>Buyer type</th>
                  <th>Qty (kg)</th>
                  <th>Avg price</th>
                  <th>Net margin (KES/kg)</th>
                  <th>Net margin (KES)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(buyerAnalytics).map(t => (
                  <tr key={t}>
                    <td><span className="badge">{t}</span></td>
                    <td>{buyerAnalytics[t].qty.toFixed(1)}</td>
                    <td>{buyerAnalytics[t].avgPrice.toFixed(2)}</td>
                    <td><b>{buyerAnalytics[t].netMarginPerKg.toFixed(2)}</b></td>
                    <td>{buyerAnalytics[t].netMargin.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small">Next: use <a className="badge" href="/cashflow">Cash Flow</a> to see expected inflows and receivables risk.</p>
        </div>
      </div>
    </div>
  );
}
