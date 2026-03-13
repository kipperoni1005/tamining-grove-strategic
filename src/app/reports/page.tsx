"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Sale } from "@/lib/types";

function ym(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: true });
        if (error) throw error;
        setSales((data ?? []) as Sale[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load sales. Are you signed in?");
      }
    })();
  }, []);

  const monthly = useMemo(() => {
    const map = new Map<string, { sales: number; costs: number; margin: number; qty: number }>();
    for (const s of sales) {
      const key = ym(s.sale_date);
      const row = map.get(key) ?? { sales: 0, costs: 0, margin: 0, qty: 0 };
      row.sales += Number(s.sale_value_kes || 0);
      row.costs += Number(s.total_costs_kes || 0);
      row.margin += Number(s.gross_margin_kes || 0);
      row.qty += Number(s.amount_sold_kg || 0);
      map.set(key, row);
    }
    return Array.from(map.entries()).map(([month, r]) => ({
      month, ...r,
      avgPrice: r.qty > 0 ? r.sales / r.qty : 0
    })).sort((a,b)=>a.month.localeCompare(b.month)).slice(-24);
  }, [sales]);

  const byType = useMemo(() => {
    const m: Record<string, {qty:number; sales:number; avgPrice:number}> = {};
    for (const s of sales) {
      const t = s.buyer_type || "Broker";
      m[t] = m[t] ?? { qty:0, sales:0, avgPrice:0 };
      m[t].qty += Number(s.amount_sold_kg||0);
      m[t].sales += Number(s.sale_value_kes||0);
    }
    for (const t of Object.keys(m)) m[t].avgPrice = m[t].qty>0 ? m[t].sales/m[t].qty : 0;
    return m;
  }, [sales]);

  const totals = useMemo(() => {
    const salesKes = sales.reduce((s, x) => s + Number(x.sale_value_kes || 0), 0);
    const costsKes = sales.reduce((s, x) => s + Number(x.total_costs_kes || 0), 0);
    const marginKes = sales.reduce((s, x) => s + Number(x.gross_margin_kes || 0), 0);
    return { salesKes, costsKes, marginKes };
  }, [sales]);

  return (
    <div className="grid" style={{gap: 16}}>
      <div className="card">
        <h1>Reports</h1>
        <p className="small">Monthly rollups + buyer type summary.</p>
        {err && <p className="error">{err}</p>}
      </div>

      <div className="grid grid3">
        <div className="card"><div className="small">Total Sales (KES)</div><div className="kpi">{totals.salesKes.toFixed(0)}</div></div>
        <div className="card"><div className="small">Sale costs (KES)</div><div className="kpi">{totals.costsKes.toFixed(0)}</div></div>
        <div className="card"><div className="small">Gross margin (KES)</div><div className="kpi">{totals.marginKes.toFixed(0)}</div></div>
      </div>

      <div className="grid grid2">
        <div className="card">
          <h2>Monthly</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Month</th><th>Qty (kg)</th><th>Sales</th><th>Avg price</th><th>Costs</th><th>Gross margin</th></tr></thead>
              <tbody>
                {monthly.map(m => (
                  <tr key={m.month}>
                    <td><span className="badge">{m.month}</span></td>
                    <td>{m.qty.toFixed(1)}</td>
                    <td>{m.sales.toFixed(0)}</td>
                    <td>{m.avgPrice.toFixed(2)}</td>
                    <td>{m.costs.toFixed(0)}</td>
                    <td><b>{m.margin.toFixed(0)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Buyer type summary</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Type</th><th>Qty (kg)</th><th>Sales (KES)</th><th>Avg price</th></tr></thead>
              <tbody>
                {Object.keys(byType).map(t => (
                  <tr key={t}>
                    <td><span className="badge">{t}</span></td>
                    <td>{byType[t].qty.toFixed(1)}</td>
                    <td>{byType[t].sales.toFixed(0)}</td>
                    <td><b>{byType[t].avgPrice.toFixed(2)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small">For profitability by buyer type, see Dashboard (uses break-even allocation).</p>
        </div>
      </div>
    </div>
  );
}
