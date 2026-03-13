"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSettings } from "@/lib/api";
import { saleValueKes, totalCostsKes, grossMarginKes, addDaysISO } from "@/lib/calc";
import type { Batch, Settings } from "@/lib/types";

function todayISO() { return new Date().toISOString().slice(0, 10); }
const BUYER_TYPES = ["Miller", "Broker", "Direct"];

export default function SalePage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [saleDate, setSaleDate] = useState(todayISO());
  const [batchId, setBatchId] = useState<string>("");

  const [buyer, setBuyer] = useState<string>("");
  const [buyerType, setBuyerType] = useState<string>("Broker");
  const [invoiceNo, setInvoiceNo] = useState<string>("");

  const [amountSold, setAmountSold] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [transport, setTransport] = useState<number>(0);
  const [storage, setStorage] = useState<number>(0);
  const [other, setOther] = useState<number>(0);

  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(0);
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<string>(todayISO());
  const [amountPaidKes, setAmountPaidKes] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>("Unpaid");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        const { data, error } = await supabase.from("batches").select("*").order("harvest_date", { ascending: false });
        if (error) throw error;
        setBatches((data ?? []) as Batch[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load batches. Are you signed in?");
      }
    })();
  }, []);

  useEffect(() => {
    setExpectedPaymentDate(addDaysISO(saleDate, paymentTermsDays || 0));
  }, [saleDate, paymentTermsDays]);

  const selected = useMemo(() => batches.find(b => b.id === batchId) ?? null, [batches, batchId]);

  const saleValue = saleValueKes(amountSold || 0, unitPrice || 0);
  const costs = totalCostsKes(transport, storage, other);
  const margin = grossMarginKes(saleValue, costs);

  async function submit() {
    setMsg(null); setErr(null);
    try {
      if (!batchId) throw new Error("Select a batch to sell from.");
      if (amountSold <= 0) throw new Error("Amount sold must be > 0.");
      if (unitPrice <= 0) throw new Error("Unit price must be > 0.");
      if (paymentTermsDays < 0) throw new Error("Payment terms days cannot be negative.");
      if (amountPaidKes < 0) throw new Error("Amount paid cannot be negative.");

      const outstanding = saleValue - (amountPaidKes || 0);
      const status =
        outstanding <= 0 ? "Paid" :
        (amountPaidKes > 0 ? "Part-paid" : "Unpaid");

      const { error } = await supabase.from("sales").insert({
        sale_date: saleDate,
        batch_id: batchId,
        buyer: buyer || null,
        buyer_type: buyerType,
        invoice_no: invoiceNo || null,
        amount_sold_kg: Number(amountSold),
        unit_price_kes: Number(unitPrice),
        sale_value_kes: saleValue,
        transport_cost_kes: Number(transport || 0),
        storage_cost_kes: Number(storage || 0),
        other_costs_kes: Number(other || 0),
        total_costs_kes: costs,
        gross_margin_kes: margin,
        payment_terms_days: Number(paymentTermsDays || 0),
        expected_payment_date: expectedPaymentDate,
        amount_paid_kes: Number(amountPaidKes || 0),
        payment_status: status
      });
      if (error) throw error;

      setMsg("Sale recorded.");
      setAmountSold(0); setUnitPrice(0); setTransport(0); setStorage(0); setOther(0);
      setBuyer(""); setInvoiceNo(""); setPaymentTermsDays(0); setAmountPaidKes(0); setPaymentStatus("Unpaid");
    } catch (e: any) {
      setErr(e.message ?? "Failed to save sale.");
    }
  }

  return (
    <div className="card">
      <h1>Record Sale</h1>
      <p className="small">Includes buyer type, payment terms and expected payment date for cash flow forecasting.</p>
      {err && <p className="error">{err}</p>}
      {msg && <p className="badge">{msg}</p>}

      <div className="row">
        <div>
          <label>Date of sale</label>
          <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </div>
        <div>
          <label>Batch</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batch_code} (stored {Number(b.weight_stored_kg).toFixed(1)}kg, {Number(b.moisture_pct).toFixed(1)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <div className="card" style={{marginTop: 10}}>
          <div className="small">Selected batch</div>
          <div className="row">
            <div><span className="badge">{selected.batch_code}</span></div>
            <div className="small">Stored: {Number(selected.weight_stored_kg).toFixed(1)} kg</div>
            <div className="small">Moisture: {Number(selected.moisture_pct).toFixed(1)}%</div>
          </div>
        </div>
      )}

      <div className="row" style={{marginTop: 10}}>
        <div><label>Buyer</label><input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer name" /></div>
        <div>
          <label>Buyer type</label>
          <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
            {BUYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label>Invoice/Receipt #</label><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" /></div>
      </div>

      <div className="row" style={{marginTop: 10}}>
        <div><label>Amount sold (kg)</label><input type="number" value={amountSold} onChange={(e) => setAmountSold(Number(e.target.value))} /></div>
        <div><label>Unit price (KES/kg)</label><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} /></div>
        <div><label>Transport cost (KES)</label><input type="number" value={transport} onChange={(e) => setTransport(Number(e.target.value))} /></div>
        <div><label>Storage cost (KES)</label><input type="number" value={storage} onChange={(e) => setStorage(Number(e.target.value))} /></div>
        <div><label>Other costs (KES)</label><input type="number" value={other} onChange={(e) => setOther(Number(e.target.value))} /></div>
      </div>

      <div className="row" style={{marginTop: 10}}>
        <div>
          <label>Payment terms (days)</label>
          <input type="number" value={paymentTermsDays} onChange={(e)=>setPaymentTermsDays(Number(e.target.value))} />
        </div>
        <div>
          <label>Expected payment date</label>
          <input type="date" value={expectedPaymentDate} onChange={(e)=>setExpectedPaymentDate(e.target.value)} />
        </div>
        <div>
          <label>Amount paid (KES)</label>
          <input type="number" value={amountPaidKes} onChange={(e)=>setAmountPaidKes(Number(e.target.value))} />
        </div>
        <div>
          <label>Payment status</label>
          <input value={paymentStatus} readOnly />
          <div className="small">Auto-set based on sale value − amount paid</div>
        </div>
      </div>

      <div className="grid grid3" style={{marginTop: 14}}>
        <div className="card"><div className="small">Sale value ({settings?.currency ?? "KES"})</div><div className="kpi">{saleValue.toFixed(0)}</div></div>
        <div className="card"><div className="small">Total costs ({settings?.currency ?? "KES"})</div><div className="kpi">{costs.toFixed(0)}</div></div>
        <div className="card"><div className="small">Gross margin ({settings?.currency ?? "KES"})</div><div className="kpi">{margin.toFixed(0)}</div></div>
      </div>

      <div style={{marginTop: 14}}>
        <button onClick={submit}>Save Sale</button>
      </div>
    </div>
  );
}
