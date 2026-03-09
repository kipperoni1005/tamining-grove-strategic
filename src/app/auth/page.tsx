"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }
  async function signUp() {
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg("Check your email for a confirmation link (if enabled).");
  }
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="card">
      <h1>Sign In</h1>
      <p className="small">Sign in to read/write data (RLS requires authenticated users).</p>

      {userEmail ? (
        <div className="row">
          <div>
            <div className="small">Signed in as</div>
            <div className="kpi">{userEmail}</div>
          </div>
          <div style={{flex:"0 0 auto"}}>
            <button className="secondary" onClick={signOut}>Sign out</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row">
            <div>
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="row" style={{marginTop: 10}}>
            <button onClick={signIn}>Sign in</button>
            <button className="secondary" onClick={signUp}>Create account</button>
          </div>
        </>
      )}

      {msg && <p className="error" style={{marginTop: 10}}>{msg}</p>}
    </div>
  );
}
