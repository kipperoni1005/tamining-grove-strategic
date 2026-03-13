"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ReceivableRow, Sale } from "@/lib/types";

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO); const b = new Date(bISO);
  return Math.floor((b.getTime() - a.getTime()) / (1000*60*60*24));
}
function todayISO() { return new Date().toISOString().slice(0,10); }

export default function CashflowPage() {
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: r, error: re }, { data: s, error: se }] = await Promise.all([
          supabase.from("v_receivables").select("*"),
          supabase.from("sales").select("*").order("sale_date", { ascending: false })
        ]);
        if (re) throw re;
        if (se) throw se;
        setRows((r ?? []) as ReceivableRow[]);
        setSales((s ?? []) as Sale[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load cash flow. Are you signed in?");
      }
    })();
  }, []);

  const receivables = useMemo(() => rows.filter(r => Number(r.outstanding_kes || 0) > 0.01), [rows]);
  const totalOutstanding = useMemo(() => receivables.reduce((s,r)=>s+Number(r.outstanding_kes||0),0), [receivables]);

  const aging = useMemo(() => {
    const t = todayISO();
    let a0=0,a31=0,a61=0;
    for (const r of receivables) {
      const age = daysBetween(r.sale_date, t);
      const amt = Number(r.outstanding_kes||0);
      if (age <= 30) a0 += amt;
      else if (age <= 60) a31 += amt;
      else a61 += amt;
    }
    return { a0, a31, a61 };
  }, [receivables]);

  const forecast = useMemo(() => {
    const t = new Date(todayISO());
    const buckets = [{label:"Next 7 days", days:7, sum:0},{label:"8–30 days", days:30, sum:0},{label:"31–60 days", days:60, sum:0},{label:"61–90 days", days:90, sum:0}];
    for (const r of receivables) {
      const d = new Date(r.expected_payment_date_calc);
      const delta = Math.floor((d.getTime() - t.getTime())/(1000*60*60*24));
      const amt = Number(r.outstanding_kes||0);
      if (delta <= 7) buckets[0].sum += amt;
      else if (delta <= 30) buckets[1].sum += amt;
      else if (delta <= 60) buckets[2].sum += amt;
      else if (delta <= 90) buckets[3].sum += amt;
    }
    return buckets;
  }, [receivables]);

  const recentSales = useMemo(() => sales.slice(0, 30), [sales]);

  return (
    <div className="grid" style={{gap: 16}}>
      <div className="card">
        <h1>Cash Flow Forecast</h1>
        <p className="small">Based on expected payment dates and outstanding balances.</p>
        {err && <p className="error">{err}</p>}
      </div>

      <div className="grid grid3">
        <div className="card">
          <div className="small">Outstanding receivables (KES)</div>
          <div className="kpi">{totalOutstanding.toFixed(0)}</div>
        </div>
        <div className="card">
          <div className="small">Aging 0–30 days (KES)</div>
          <div className="kpi">{aging.a0.toFixed(0)}</div>
        </div>
        <div className="card">
          <div className="small">Aging 31–60 / 60+ (KES)</div>
          <div className="kpi">{(aging.a31 + aging.a61).toFixed(0)}</div>
          <div className="small">31–60: {aging.a31.toFixed(0)} • 60+: {aging.a61.toFixed(0)}</div>
        </div>
      </div>

      <div className="grid grid2">
        <div className="card">
          <h2>Expected inflows</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Window</th><th>Expected inflow (KES)</th></tr></thead>
              <tbody>
                {forecast.map(b => (
                  <tr key={b.label}>
                    <td><span className="badge">{b.label}</span></td>
                    <td><b>{b.sum.toFixed(0)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small">Tip: Keep buyer type + payment terms accurate when recording sales.</p>
        </div>

        <div className="card">
          <h2>Open invoices</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead>
                <tr>
                  <th>Buyer</th><th>Type</th><th>Invoice</th><th>Sale date</th><th>Expected</th><th>Outstanding (KES)</th>
                </tr>
              </thead>
              <tbody>
                {receivables.sort((a,b)=>a.expected_payment_date_calc.localeCompare(b.expected_payment_date_calc)).slice(0, 50).map(r => (
                  <tr key={r.id}>
                    <td>{r.buyer ?? "—"}</td>
                    <td><span className="badge">{r.buyer_type}</span></td>
                    <td>{r.invoice_no ?? ""}</td>
                    <td>{r.sale_date}</td>
                    <td>{r.expected_payment_date_calc.slice(0,10)}</td>
                    <td><b>{Number(r.outstanding_kes).toFixed(0)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Recent sales (for reference)</h2>
        <div style={{overflowX:"auto"}}>
          <table className="table">
            <thead><tr><th>Date</th><th>Buyer</th><th>Type</th><th>Value (KES)</th><th>Paid</th><th>Status</th></tr></thead>
            <tbody>
              {recentSales.map(s => (
                <tr key={s.id}>
                  <td>{s.sale_date}</td>
                  <td>{s.buyer ?? "—"}</td>
                  <td><span className="badge">{s.buyer_type}</span></td>
                  <td>{Number(s.sale_value_kes).toFixed(0)}</td>
                  <td>{Number(s.amount_paid_kes).toFixed(0)}</td>
                  <td><span className="badge">{s.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
