"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { daysSince } from "@/lib/calc";
import type { Batch, Sale, Field, Variety, Store } from "@/lib/types";

export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [fieldId, setFieldId] = useState<string>("");
  const [varietyId, setVarietyId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: b }, { data: s }, { data: f }, { data: v }, { data: st }] = await Promise.all([
          supabase.from("batches").select("*").order("harvest_date", { ascending: false }),
          supabase.from("sales").select("*"),
          supabase.from("fields").select("*").order("name"),
          supabase.from("varieties").select("*").order("name"),
          supabase.from("stores").select("*").order("name"),
        ]);
        setBatches((b ?? []) as Batch[]);
        setSales((s ?? []) as Sale[]);
        setFields((f ?? []) as Field[]);
        setVarieties((v ?? []) as Variety[]);
        setStores((st ?? []) as Store[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load inventory. Are you signed in?");
      }
    })();
  }, []);

  const soldByBatch = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sales) m.set(s.batch_id, (m.get(s.batch_id) ?? 0) + Number(s.amount_sold_kg || 0));
    return m;
  }, [sales]);

  const rows = useMemo(() => {
    return batches
      .filter(b => !fieldId || b.field_id === fieldId)
      .filter(b => !varietyId || b.variety_id === varietyId)
      .filter(b => !storeId || b.store_id === storeId)
      .map(b => {
        const sold = soldByBatch.get(b.id) ?? 0;
        const remaining = Number(b.weight_stored_kg || 0) - sold;
        const age = daysSince(b.harvest_date);
        return { batch: b, sold, remaining, age };
      });
  }, [batches, fieldId, varietyId, storeId, soldByBatch]);

  const totals = useMemo(() => {
    const stored = rows.reduce((s, r) => s + Number(r.batch.weight_stored_kg || 0), 0);
    const sold = rows.reduce((s, r) => s + Number(r.sold || 0), 0);
    return { stored, sold, stock: stored - sold };
  }, [rows]);

  const nameOf = (arr: {id:string; name:string}[], id: string | null) => arr.find(x => x.id === id)?.name ?? "—";
  const ageClass = (age:number) => age>=90 ? "badge danger" : age>=60 ? "badge warn" : "badge";

  return (
    <div className="card">
      <h1>Inventory</h1>
      <p className="small">Remaining stock by batch (Stored − Sold). Aging alerts at 60/90 days.</p>
      {err && <p className="error">{err}</p>}

      <div className="row" style={{marginTop: 10}}>
        <div><label>Field</label>
          <select value={fieldId} onChange={(e)=>setFieldId(e.target.value)}>
            <option value="">All</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div><label>Variety</label>
          <select value={varietyId} onChange={(e)=>setVarietyId(e.target.value)}>
            <option value="">All</option>
            {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div><label>Store</label>
          <select value={storeId} onChange={(e)=>setStoreId(e.target.value)}>
            <option value="">All</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid3" style={{marginTop: 14}}>
        <div className="card"><div className="small">Stored (kg)</div><div className="kpi">{totals.stored.toFixed(1)}</div></div>
        <div className="card"><div className="small">Sold (kg)</div><div className="kpi">{totals.sold.toFixed(1)}</div></div>
        <div className="card"><div className="small">Stock (kg)</div><div className="kpi">{totals.stock.toFixed(1)}</div></div>
      </div>

      <div style={{marginTop: 14, overflowX:"auto"}}>
        <table className="table">
          <thead>
            <tr>
              <th>Batch</th><th>Age</th><th>Harvest</th><th>Field</th><th>Variety</th><th>Store</th>
              <th>Moisture</th><th>Stored</th><th>Sold</th><th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.batch.id}>
                <td><span className="badge">{r.batch.batch_code}</span></td>
                <td><span className={ageClass(r.age)}>{r.age}d</span></td>
                <td>{r.batch.harvest_date}</td>
                <td>{nameOf(fields, r.batch.field_id)}</td>
                <td>{nameOf(varieties, r.batch.variety_id)}</td>
                <td>{nameOf(stores, r.batch.store_id)}</td>
                <td>{Number(r.batch.moisture_pct).toFixed(1)}%</td>
                <td>{Number(r.batch.weight_stored_kg).toFixed(1)}</td>
                <td>{Number(r.sold).toFixed(1)}</td>
                <td><b>{Number(r.remaining).toFixed(1)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
