"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSettings } from "@/lib/api";
import { dryMatterKg, toStdMoistureKg } from "@/lib/calc";
import type { Field, Variety, Store, Settings } from "@/lib/types";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function HarvestPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [harvestDate, setHarvestDate] = useState(todayISO());
  const [fieldId, setFieldId] = useState<string>("");
  const [varietyId, setVarietyId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");
  const [weightHarvested, setWeightHarvested] = useState<number | "">("");
  const [moisture, setMoisture] = useState<number>(18);
  const [weightStored, setWeightStored] = useState<number>(0);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        const [{ data: f }, { data: v }, { data: st }] = await Promise.all([
          supabase.from("fields").select("*").order("name"),
          supabase.from("varieties").select("*").order("name"),
          supabase.from("stores").select("*").order("name"),
        ]);
        setFields((f ?? []) as Field[]);
        setVarieties((v ?? []) as Variety[]);
        setStores((st ?? []) as Store[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load master data. Are you signed in?");
      }
    })();
  }, []);

  const dryMatter = weightStored ? dryMatterKg(Number(weightStored), Number(moisture)) : 0;
  const storedStd = settings ? toStdMoistureKg(dryMatter, settings.standard_moisture) : 0;

  async function submit() {
    setMsg(null); setErr(null);
    try {
      if (!settings) throw new Error("Settings not loaded.");
      if (!fieldId || !varietyId || !storeId) throw new Error("Select field, variety and store.");
      if (!weightStored || Number(weightStored) <= 0) throw new Error("Enter stored weight (kg).");
      if (moisture <= 0 || moisture >= 100) throw new Error("Moisture must be between 0 and 100.");

      const field = fields.find(x => x.id === fieldId)?.name ?? "FIELD";
      const variety = varieties.find(x => x.id === varietyId)?.name ?? "VAR";
      const stamp = `${harvestDate}-${field}-${variety}`.replace(/\s+/g, "").toUpperCase();
      const batchCode = `${stamp}-${Math.floor(Math.random()*900+100)}`;

      const dm = dryMatterKg(Number(weightStored), Number(moisture));
      const std = toStdMoistureKg(dm, settings.standard_moisture);

      const { error } = await supabase.from("batches").insert({
        batch_code: batchCode,
        harvest_date: harvestDate,
        field_id: fieldId,
        variety_id: varietyId,
        store_id: storeId,
        weight_harvested_kg: weightHarvested === "" ? null : Number(weightHarvested),
        moisture_pct: Number(moisture),
        weight_stored_kg: Number(weightStored),
        dry_matter_kg: dm,
        stored_std_kg: std
      });
      if (error) throw error;

      setMsg(`Saved batch: ${batchCode}`);
      setWeightHarvested("");
      setWeightStored(0);
    } catch (e: any) {
      setErr(e.message ?? "Failed to save.");
    }
  }

  return (
    <div className="card">
      <h1>Add Harvest / Intake</h1>
      <p className="small">Creates a Batch. Moisture-adjusted stored weight is computed automatically.</p>
      {err && <p className="error">{err}</p>}
      {msg && <p className="badge">{msg}</p>}

      <div className="row">
        <div>
          <label>Date of harvest</label>
          <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
        </div>
        <div>
          <label>Field</label>
          <select value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            <option value="">Select field</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label>Variety</label>
          <select value={varietyId} onChange={(e) => setVarietyId(e.target.value)}>
            <option value="">Select variety</option>
            {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{marginTop: 10}}>
        <div>
          <label>Weight harvested (kg) (optional)</label>
          <input type="number" value={weightHarvested} onChange={(e) => setWeightHarvested(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
        <div>
          <label>Moisture (%)</label>
          <input type="number" value={moisture} onChange={(e) => setMoisture(Number(e.target.value))} />
        </div>
        <div>
          <label>Weight packed & stored (kg)</label>
          <input type="number" value={weightStored} onChange={(e) => setWeightStored(Number(e.target.value))} />
        </div>
        <div>
          <label>Store / Warehouse</label>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select store</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid2" style={{marginTop: 14}}>
        <div className="card">
          <div className="small">Dry matter (kg)</div>
          <div className="kpi">{dryMatter.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="small">Stored @ Std moisture ({settings?.standard_moisture ?? "…"}%)</div>
          <div className="kpi">{storedStd.toFixed(2)}</div>
        </div>
      </div>

      <div style={{marginTop: 14}}>
        <button onClick={submit}>Save Batch</button>
      </div>

      <p className="small" style={{marginTop: 12}}>
        Tip: Add Fields/Varieties/Stores in <a className="badge" href="/settings">Settings</a> first.
      </p>
    </div>
  );
}
