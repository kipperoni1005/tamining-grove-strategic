"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSettings } from "@/lib/api";
import type { Field, Variety, Store, Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [standardMoisture, setStandardMoisture] = useState<number>(13.5);
  const [companyName, setCompanyName] = useState<string>("Tamining Grove Limited");

  const [fields, setFields] = useState<Field[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [newField, setNewField] = useState("");
  const [newFieldAcres, setNewFieldAcres] = useState<number>(0);
  const [newVariety, setNewVariety] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newStoreLoc, setNewStoreLoc] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const s = await getSettings();
    setSettings(s);
    setStandardMoisture(Number(s.standard_moisture));
    setCompanyName(s.company_name);

    const [{ data: f }, { data: v }, { data: st }] = await Promise.all([
      supabase.from("fields").select("*").order("name"),
      supabase.from("varieties").select("*").order("name"),
      supabase.from("stores").select("*").order("name"),
    ]);
    setFields((f ?? []) as Field[]);
    setVarieties((v ?? []) as Variety[]);
    setStores((st ?? []) as Store[]);
  }

  useEffect(() => {
    (async () => {
      try { await refresh(); }
      catch (e: any) { setErr(e.message ?? "Failed to load settings. Are you signed in?"); }
    })();
  }, []);

  async function saveSettings() {
    setMsg(null); setErr(null);
    try {
      if (!settings) throw new Error("Settings not loaded.");
      const { error } = await supabase.from("settings").update({
        standard_moisture: Number(standardMoisture),
        company_name: companyName
      }).eq("id", settings.id);
      if (error) throw error;
      setMsg("Settings saved.");
      await refresh();
    } catch (e: any) { setErr(e.message ?? "Failed to save settings."); }
  }

  async function addField() {
    setMsg(null); setErr(null);
    try {
      if (!newField.trim()) return;
      const { error } = await supabase.from("fields").insert({ name: newField.trim(), size_acres: Number(newFieldAcres || 0) });
      if (error) throw error;
      setNewField(""); setNewFieldAcres(0);
      setMsg("Field added.");
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  async function addVariety() {
    setMsg(null); setErr(null);
    try {
      if (!newVariety.trim()) return;
      const { error } = await supabase.from("varieties").insert({ name: newVariety.trim() });
      if (error) throw error;
      setNewVariety("");
      setMsg("Variety added.");
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  async function addStore() {
    setMsg(null); setErr(null);
    try {
      if (!newStore.trim()) return;
      const { error } = await supabase.from("stores").insert({ name: newStore.trim(), location: newStoreLoc.trim() || null });
      if (error) throw error;
      setNewStore(""); setNewStoreLoc("");
      setMsg("Store added.");
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  async function updateFieldSize(id: string, size: number) {
    setMsg(null); setErr(null);
    try {
      const { error } = await supabase.from("fields").update({ size_acres: Number(size || 0) }).eq("id", id);
      if (error) throw error;
      setMsg("Field size updated.");
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  const totalAcres = fields.reduce((s, f) => s + Number(f.size_acres || 0), 0);

  return (
    <div className="grid" style={{gap: 16}}>
      <div className="card">
        <h1>Settings</h1>
        <p className="small">Company name, standard moisture, and master lists.</p>
        {err && <p className="error">{err}</p>}
        {msg && <p className="badge">{msg}</p>}

        <div className="row">
          <div><label>Company name</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div><label>Standard moisture (%)</label><input type="number" value={standardMoisture} onChange={(e) => setStandardMoisture(Number(e.target.value))} /></div>
          <div style={{flex:"0 0 auto", alignSelf:"end"}}><button onClick={saveSettings}>Save settings</button></div>
        </div>
      </div>

      <div className="grid grid3">
        <div className="card">
          <h2>Fields</h2>
          <div className="row">
            <input value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="e.g., Field 1" />
            <input type="number" value={newFieldAcres} onChange={(e) => setNewFieldAcres(Number(e.target.value))} placeholder="Acres" />
            <button onClick={addField}>Add</button>
          </div>
          <p className="small">Total acres: <b>{totalAcres.toFixed(1)}</b></p>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Field</th><th>Acres</th><th>Update</th></tr></thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td><input type="number" defaultValue={Number(f.size_acres || 0)} onBlur={(e) => updateFieldSize(f.id, Number(e.target.value))} /></td>
                    <td className="small">Click outside to save</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Varieties</h2>
          <div className="row">
            <input value={newVariety} onChange={(e) => setNewVariety(e.target.value)} placeholder="e.g., H614D" />
            <button onClick={addVariety}>Add</button>
          </div>
          <ul className="small">{varieties.map(v => <li key={v.id}>{v.name}</li>)}</ul>
        </div>

        <div className="card">
          <h2>Stores</h2>
          <div className="row">
            <input value={newStore} onChange={(e) => setNewStore(e.target.value)} placeholder="e.g., Main Store" />
            <input value={newStoreLoc} onChange={(e) => setNewStoreLoc(e.target.value)} placeholder="Location (optional)" />
            <button onClick={addStore}>Add</button>
          </div>
          <ul className="small">{stores.map(s => <li key={s.id}>{s.name}{s.location ? ` — ${s.location}` : ""}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
