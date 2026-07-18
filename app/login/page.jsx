"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Blocks, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase, heeftSupabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [modus, setModus] = useState("inloggen");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  useEffect(() => {
    if (!heeftSupabase) return;
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/"); });
  }, [router]);

  async function verstuur(e) {
    e.preventDefault();
    if (!heeftSupabase) { setMelding({ type: "fout", tekst: "Er zijn nog geen Supabase-sleutels ingesteld." }); return; }
    setBezig(true); setMelding(null);
    try {
      if (modus === "inloggen") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
        if (error) throw error;
        router.replace("/");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: wachtwoord });
        if (error) throw error;
        if (data.session) router.replace("/");
        else setMelding({ type: "ok", tekst: "Check je mail: er staat een bevestigingslink in." });
      }
    } catch (err) {
      setMelding({ type: "fout", tekst: vertaal(err.message) });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-mark"><Blocks size={18} /></div>
        <h1 className="auth-title">{modus === "inloggen" ? "Log in op je dashboard" : "Maak een dashboard aan"}</h1>
        <p className="auth-sub">
          {modus === "inloggen"
            ? "Je week, je klussen en je opvangbak staan achter je e-mailadres."
            : "Eén account, en je planning staat op elk apparaat waar je inlogt."}
        </p>

        <form onSubmit={verstuur} className="auth-form">
          <label className="auth-field">
            <Mail size={14} />
            <input type="email" required placeholder="jij@voorbeeld.nl" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="auth-field">
            <Lock size={14} />
            <input type="password" required minLength={6} placeholder="Wachtwoord" value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              autoComplete={modus === "inloggen" ? "current-password" : "new-password"} />
          </label>

          {melding && <div className={`auth-melding ${melding.type}`}>{melding.tekst}</div>}

          <button className="btn-primary auth-knop" disabled={bezig}>
            {bezig ? "Bezig…" : modus === "inloggen" ? "Inloggen" : "Account aanmaken"}
            {!bezig && <ArrowRight size={14} />}
          </button>
        </form>

        <button className="auth-wissel" onClick={() => { setModus(modus === "inloggen" ? "aanmelden" : "inloggen"); setMelding(null); }}>
          {modus === "inloggen" ? "Nog geen account? Maak er een aan" : "Heb je al een account? Log in"}
        </button>

        {!heeftSupabase && (
          <p className="auth-noot">
            Er zijn nog geen Supabase-sleutels ingesteld, dus inloggen doet nog niets. Zonder sleutels draait het
            dashboard in lokale modus en staat alles gewoon in je browser.
          </p>
        )}
      </div>
    </div>
  );
}

function vertaal(m = "") {
  if (m.includes("Invalid login")) return "Dit e-mailadres en wachtwoord horen niet bij elkaar.";
  if (m.includes("already registered")) return "Dit e-mailadres heeft al een account. Log in.";
  if (m.includes("at least 6")) return "Je wachtwoord moet minstens zes tekens hebben.";
  return m;
}
