"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Field, FieldCostEntry } from "@/lib/types";

function todayISO() { return new Date().toISOString().slice(0, 10); }
const categories = ["seed","fertilizer","chemicals","labor","fuel","other"];

export default function CostsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [entries, setEntries] = useState<FieldCostEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [costDate, setCostDate] = useState(todayISO());
  const [fieldId, setFieldId] = useState("");
  const [category, setCategory] = useState("fertilizer");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState("");

  async function refresh() {
    const [{ data: f, error: fe }, { data: e, error: ee }] = await Promise.all([
      supabase.from("fields").select("*").order("name"),
      supabase.from("field_cost_entries").select("*").order("cost_date", { ascending: false }),
    ]);
    if (fe) throw fe;
    if (ee) throw ee;
    setFields((f ?? []) as Field[]);
    setEntries((e ?? []) as FieldCostEntry[]);
  }

  useEffect(() => {
    (async () => {
      try { await refresh(); }
      catch (e: any) { setErr(e.message ?? "Failed to load costs. Are you signed in?"); }
    })();
  }, []);

  async function add() {
    setErr(null); setMsg(null);
    try {
      if (!fieldId) throw new Error("Select a field.");
      if (!amount || amount <= 0) throw new Error("Amount must be > 0.");
      const { error } = await supabase.from("field_cost_entries").insert({
        cost_date: costDate,
        field_id: fieldId,
        category,
        description: description || null,
        amount_kes: Number(amount),
        reference_no: referenceNo || null
      });
      if (error) throw error;
      setMsg("Cost saved.");
      setAmount(0); setDescription(""); setReferenceNo("");
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? "Failed to save cost.");
    }
  }

  const total = useMemo(() => entries.reduce((s, e) => s + Number(e.amount_kes || 0), 0), [entries]);
  const totalsByField = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.field_id, (m.get(e.field_id) ?? 0) + Number(e.amount_kes || 0));
    return m;
  }, [entries]);
  const fieldName = (id: string) => fields.find(f => f.id === id)?.name ?? "—";

  return (
    <div className="grid" style={{gap: 16}}>
      <div className="card">
        <h1>Field Costs</h1>
        <p className="small">Enter costs per field. Used for break-even and net profit.</p>
        {err && <p className="error">{err}</p>}
        {msg && <p className="badge">{msg}</p>}

        <div className="row">
          <div><label>Date</label><input type="date" value={costDate} onChange={(e)=>setCostDate(e.target.value)} /></div>
          <div><label>Field</label>
            <select value={fieldId} onChange={(e)=>setFieldId(e.target.value)}>
              <option value="">Select field</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label>Category</label>
            <select value={category} onChange={(e)=>setCategory(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop: 10}}>
          <div><label>Description</label><input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="e.g., Urea top-dress" /></div>
          <div><label>Amount (KES)</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} /></div>
          <div><label>Reference #</label><input value={referenceNo} onChange={(e)=>setReferenceNo(e.target.value)} placeholder="Receipt/Invoice #" /></div>
          <div style={{flex:"0 0 auto", alignSelf:"end"}}><button onClick={add}>Save cost</button></div>
        </div>
      </div>

      <div className="grid grid2">
        <div className="card"><h2>Total production costs</h2><div className="kpi">{total.toFixed(0)} KES</div></div>
        <div className="card">
          <h2>Costs by field</h2>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Field</th><th>Total (KES)</th></tr></thead>
              <tbody>
                {fields.map(f => <tr key={f.id}><td>{f.name}</td><td>{(totalsByField.get(f.id) ?? 0).toFixed(0)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Recent entries</h2>
        <div style={{overflowX:"auto"}}>
          <table className="table">
            <thead><tr><th>Date</th><th>Field</th><th>Category</th><th>Description</th><th>Amount</th><th>Ref</th></tr></thead>
            <tbody>
              {entries.slice(0, 50).map(e => (
                <tr key={e.id}>
                  <td>{e.cost_date}</td>
                  <td>{fieldName(e.field_id)}</td>
                  <td><span className="badge">{e.category}</span></td>
                  <td>{e.description ?? ""}</td>
                  <td><b>{Number(e.amount_kes).toFixed(0)}</b></td>
                  <td>{e.reference_no ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
