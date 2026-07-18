"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, Megaphone, BarChart3, Inbox, Plug, LifeBuoy,
  Settings, Search, Bell, PanelLeft, SlidersHorizontal, MoreHorizontal,
  Maximize2, TrendingUp, PieChart, Clock, Globe, ArrowUp, ArrowDown,
  Check, X, ChevronDown, ChevronLeft, ChevronRight, Trash2, Blocks,
  Download, Upload, CornerDownLeft, Plus, Wand2, LogOut, Sparkles, Sun, Repeat,
  CalendarPlus, Copy,
} from "lucide-react";
import { supabase, heeftSupabase } from "../lib/supabase";
import { buildIcs } from "../lib/ics";

/* ================================== model ================================== */

export const TYPES = {
  verplicht: { label: "Verplicht", color: "#7c86a8", chart: "#4a5168", soft: "rgba(124,134,168,0.16)", line: "rgba(124,134,168,0.45)" },
  vrij: { label: "Vrije tijd", color: "#7aa793", chart: "#47665a", soft: "rgba(122,167,147,0.14)", line: "rgba(122,167,147,0.45)" },
  klus: { label: "Huishouden", color: "#a89578", chart: "#6b5c45", soft: "rgba(168,149,120,0.13)", line: "rgba(168,149,120,0.4)" },
};

const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const FULL = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const DEFAULT_SETTINGS = { dayStart: 7, dayEnd: 23, fullDay: 9, minVrij: 6 };
const SPORT = /gym|sport|hardlop|rennen|zwem|fitness|training|voetbal|tennis|fiets|yoga|padel/i;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(new Date(d), -((new Date(d).getDay() + 6) % 7));
const parse = (s) => { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); };
const between = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const toH = (t) => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
const uid = () => Math.random().toString(36).slice(2, 9);
const dayName = (d) => FULL[(parse(d).getDay() + 6) % 7];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function seed() {
  const mon = startOfWeek(new Date());
  const D = (n) => iso(addDays(mon, n));

  // vijf weken terug, zodat er meteen iets te herkennen valt
  const historie = [];
  for (let w = 1; w <= 5; w++) {
    const m = addDays(mon, -7 * w);
    const P = (n) => iso(addDays(m, n));
    for (const d of [0, 1, 2, 3, 4]) {
      historie.push({ id: uid(), date: P(d), start: 9, end: d === 2 ? 21 : 17, title: "Werk", type: "verplicht" });
    }
    if (w !== 3) historie.push({ id: uid(), date: P(1), start: 18.5, end: 20, title: "Gym", type: "vrij" });
    if (w % 2 === 1) historie.push({ id: uid(), date: P(3), start: 18.5, end: 20, title: "Gym", type: "vrij" });
    historie.push({ id: uid(), date: P(5), start: 11, end: 12.5, title: "Boodschappen", type: "klus" });
    historie.push({ id: uid(), date: P(6), start: 12, end: 13.5, title: "Wandelen", type: "vrij" });
    if (w !== 4) historie.push({ id: uid(), date: P(0), start: 19, end: 20.5, title: "Koken met Sam", type: "vrij" });
  }

  return {
    settings: { ...DEFAULT_SETTINGS },
    profile: { name: "", kleur: "#57a98b" },
    inbox: [
      { id: uid(), text: "Bank bellen over de rekening", dur: 0.5, created: iso(addDays(new Date(), -3)) },
      { id: uid(), text: "Cadeau kopen voor Sam", dur: 1, created: iso(addDays(new Date(), -1)) },
    ],
    events: [
      ...historie,
      { id: uid(), date: D(0), start: 9, end: 17, title: "Werk", type: "verplicht" },
      { id: uid(), date: D(0), start: 19, end: 20.5, title: "Koken met Sam", type: "vrij" },
      { id: uid(), date: D(1), start: 9, end: 17, title: "Werk", type: "verplicht" },
      { id: uid(), date: D(1), start: 18.5, end: 20, title: "Gym", type: "vrij" },
      { id: uid(), date: D(2), start: 9, end: 21, title: "Werk", type: "verplicht" },
      { id: uid(), date: D(2), start: 21.5, end: 22.5, title: "Gym", type: "vrij" },
      { id: uid(), date: D(3), start: 9, end: 17, title: "Werk", type: "verplicht" },
      { id: uid(), date: D(3), start: 17.5, end: 18.5, title: "Tandarts", type: "verplicht" },
      { id: uid(), date: D(4), start: 9, end: 15, title: "Werk", type: "verplicht" },
      { id: uid(), date: D(4), start: 20, end: 22, title: "Film kijken", type: "vrij" },
      { id: uid(), date: D(5), start: 11, end: 12.5, title: "Boodschappen", type: "klus" },
      { id: uid(), date: D(5), start: 21, end: 23, title: "Uitgaan", type: "vrij" },
      { id: uid(), date: D(6), start: 12, end: 13.5, title: "Wandelen", type: "vrij" },
    ],
    chores: [
      { id: uid(), name: "Stofzuigen", every: 4, last: iso(addDays(new Date(), -3)), dur: 0.75 },
      { id: uid(), name: "Was draaien", every: 5, last: iso(addDays(new Date(), -6)), dur: 1 },
      { id: uid(), name: "Ramen lappen", every: 21, last: iso(addDays(new Date(), -26)), dur: 1.5 },
      { id: uid(), name: "Planten water geven", every: 7, last: iso(addDays(new Date(), -2)), dur: 0.25 },
    ],
  };
}

const hoursOf = (e) => e.end - e.start;
const onDay = (evs, d) => evs.filter((e) => e.date === d).sort((a, b) => a.start - b.start);
const loadOf = (evs, d, t) => onDay(evs, d).filter((e) => !t || e.type === t).reduce((s, e) => s + hoursOf(e), 0);
const awakeOf = (s) => s.dayEnd - s.dayStart;
const freeCap = (evs, d, s) => Math.max(0, awakeOf(s) - loadOf(evs, d));
const busyAt = (evs, date, h) =>
  onDay(evs, date).filter((e) => e.start < h + 1 && e.end > h)
    .reduce((s, e) => s + Math.min(e.end, h + 1) - Math.max(e.start, h), 0);

function findSlot(evs, date, dur, s, earliest) {
  let cursor = Math.max(earliest ?? s.dayStart + 1, s.dayStart + 1);
  for (const e of onDay(evs, date)) {
    if (e.start - cursor >= dur) return cursor;
    cursor = Math.max(cursor, e.end + 0.25);
  }
  return s.dayEnd - 1 - cursor >= dur ? cursor : null;
}

/** beste moment in de resterende dagen van de getoonde week */
function bestSlot(evs, weekDates, todayIso, s, dur, vanaf = 9) {
  const dagen = weekDates.filter((d) => d >= todayIso);
  const kandidaten = dagen.length ? dagen : weekDates;
  return kandidaten
    .map((d) => ({ date: d, cap: freeCap(evs, d, s), start: findSlot(evs, d, dur, s, vanaf) }))
    .filter((x) => x.start != null)
    .sort((a, b) => b.cap - a.cap)[0] || null;
}

const normTitel = (t) => t.trim().toLowerCase();
const mediaan = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

/**
 * Kijkt terug in je agenda en zoekt dingen die vaak terugkomen.
 * Levert per gewoonte de vaste dag, het gebruikelijke tijdstip, de duur
 * en hoe zeker het patroon is.
 */
function patronen(events, todayIso, weken = 8) {
  const grens = iso(addDays(parse(todayIso), -weken * 7));
  const groepen = {};
  for (const e of events) {
    if (e.date > todayIso || e.date < grens) continue;
    (groepen[normTitel(e.title)] ||= []).push(e);
  }

  return Object.entries(groepen).map(([key, lijst]) => {
    const datums = [...new Set(lijst.map((e) => e.date))].sort();
    if (datums.length < 3) return null;

    const telling = {};
    for (const e of lijst) {
      const wd = (parse(e.date).getDay() + 6) % 7;
      telling[wd] = (telling[wd] || 0) + 1;
    }
    const [dag, raak] = Object.entries(telling).sort((a, b) => b[1] - a[1])[0];
    const gaten = datums.slice(1).map((d, i) => between(datums[i], d));
    const ritme = gaten.length ? Math.round(gaten.reduce((a, b) => a + b, 0) / gaten.length) : null;

    return {
      key,
      titel: lijst[lijst.length - 1].title,
      type: lijst[0].type,
      keer: datums.length,
      dag: +dag,
      zekerheid: raak / lijst.length,
      start: mediaan(lijst.map((e) => e.start)),
      dur: mediaan(lijst.map(hoursOf)),
      ritme,
      laatst: datums[datums.length - 1],
    };
  }).filter((p) => p && (p.zekerheid >= 0.5 || p.ritme));
}

/** eerstvolgende datum in de week die op weekdag `wd` valt en nog niet geweest is */
function volgendeDag(weekDates, todayIso, wd) {
  return weekDates.find((d) => d >= todayIso && (parse(d).getDay() + 6) % 7 === wd) || null;
}

/* zoekt zelf naar knelpunten in de week en stelt oplossingen voor */
function suggest(events, chores, inbox, weekDates, todayIso, s, geleerd = [], genegeerd = []) {
  const out = [];
  const future = weekDates.filter((d) => d >= todayIso);

  for (const d of future) {
    const v = loadOf(events, d, "verplicht");
    if (v < s.fullDay) continue;
    for (const ev of onDay(events, d).filter((e) => e.type === "vrij")) {
      const beter = future
        .filter((x) => x !== d && loadOf(events, x, "verplicht") <= s.fullDay - 3)
        .sort((a, b) => freeCap(events, b, s) - freeCap(events, a, s))[0];
      if (!beter) continue;
      const slot = findSlot(events, beter, hoursOf(ev), s, 9);
      if (slot == null) continue;
      out.push({
        id: `move-${ev.id}`, urgent: true, icon: Calendar,
        head: `${ev.title} staat op een volle dag`,
        body: `Je werkt ${dayName(d)} ${v} uur. ${cap(dayName(beter))} is rustiger — om ${hhmm(slot)}?`,
        cta: `Naar ${dayName(beter)}`,
        action: { kind: "move", eventId: ev.id, date: beter, start: slot },
      });
    }
  }

  const gepland = new Set(events.filter((e) => e.choreId).map((e) => e.choreId));
  for (const c of chores) {
    if (gepland.has(c.id)) continue;
    const geleden = between(c.last, todayIso);
    if (geleden < c.every) continue;
    const k = future
      .map((d) => ({ d, cap: freeCap(events, d, s), slot: findSlot(events, d, c.dur, s, 9) }))
      .filter((x) => x.slot != null && x.cap >= 4)
      .sort((a, b) => b.cap - a.cap)[0];
    if (!k) continue;
    out.push({
      id: `chore-${c.id}`, urgent: geleden - c.every > 2, icon: Megaphone,
      head: `${c.name} moet weer gebeuren`,
      body: `${geleden} dagen geleden, normaal om de ${c.every}. ${cap(dayName(k.d))} om ${hhmm(k.slot)} is er ruimte.`,
      cta: `Zet op ${dayName(k.d)}`,
      action: { kind: "chore", chore: c, date: k.d, start: k.slot },
    });
  }

  for (const item of inbox || []) {
    const oud = between(item.created, todayIso);
    if (oud < 1) continue;
    const k = future
      .map((d) => ({ d, cap: freeCap(events, d, s), slot: findSlot(events, d, item.dur, s, 9) }))
      .filter((x) => x.slot != null && x.cap >= 3)
      .sort((a, b) => b.cap - a.cap)[0];
    if (!k) continue;
    out.push({
      id: `inbox-${item.id}`, urgent: oud > 4, icon: Inbox,
      head: `${item.text} ligt er ${oud} ${oud === 1 ? "dag" : "dagen"}`,
      body: `Het staat in je opvangbak zonder moment. ${cap(dayName(k.d))} om ${hhmm(k.slot)} past, ${Math.round(item.dur * 60)} minuten.`,
      cta: `Plan ${dayName(k.d)}`,
      action: { kind: "inbox", item, date: k.d, start: k.slot },
    });
  }

  for (const p of geleerd) {
    if (genegeerd.includes(p.key)) continue;
    if (p.type === "verplicht" || p.keer < 3) continue;

    const dag = p.zekerheid >= 0.6 ? volgendeDag(weekDates, todayIso, p.dag) : null;
    const staatAl = (d) => onDay(events, d).some((e) => normTitel(e.title) === p.key);

    if (dag && !staatAl(dag)) {
      const vrijOp = findSlot(events, dag, p.dur, s, Math.max(s.dayStart + 1, p.start - 1)) ?? findSlot(events, dag, p.dur, s, 9);
      if (vrijOp != null) {
        const tijd = Math.abs(vrijOp - p.start) < 1 ? p.start : vrijOp;
        out.push({
          id: `patroon-${p.key}-${dag}`, urgent: false, icon: Repeat,
          head: `${p.titel} staat nog niet in je week`,
          body: `Je doet dit meestal op ${FULL[p.dag]} rond ${hhmm(p.start)} — ${p.keer} keer de afgelopen weken. ${cap(dayName(dag))} is nog vrij op dat moment.`,
          cta: `Zet op ${dayName(dag)}`,
          action: { kind: "add", date: dag, start: tijd, end: tijd + p.dur, title: p.titel, type: p.type },
        });
        continue;
      }
    }

    if (p.ritme && between(p.laatst, todayIso) >= p.ritme + 1) {
      const doel = bestSlot(events, weekDates, todayIso, s, p.dur, Math.max(9, Math.floor(p.start) - 1));
      if (doel && !staatAl(doel.date)) {
        out.push({
          id: `ritme-${p.key}`, urgent: false, icon: Repeat,
          head: `${p.titel} is er even bij ingeschoten`,
          body: `Normaal ongeveer elke ${p.ritme} dagen, en het is nu ${between(p.laatst, todayIso)} dagen geleden. ${cap(dayName(doel.date))} om ${hhmm(doel.start)}?`,
          cta: `Plan ${dayName(doel.date)}`,
          action: { kind: "add", date: doel.date, start: doel.start, end: doel.start + p.dur, title: p.titel, type: p.type },
        });
      }
    }
  }

  const vrij = weekDates.reduce((sum, d) => sum + loadOf(events, d, "vrij"), 0);
  if (vrij < s.minVrij) {
    const rustig = [...future].sort((a, b) => freeCap(events, b, s) - freeCap(events, a, s))[0];
    if (rustig) {
      const st = findSlot(events, rustig, 2, s, 10) ?? 19;
      out.push({
        id: "breathe", urgent: false, icon: Sparkles,
        head: "Weinig tijd voor jezelf",
        body: `Maar ${vrij.toFixed(1)} uur vrij deze week, je ondergrens is ${s.minVrij}. ${cap(dayName(rustig))} is het rustigst — twee uur blokken?`,
        cta: "Blok 2 uur",
        action: { kind: "add", date: rustig, start: st, end: st + 2, title: "Voor mezelf", type: "vrij" },
      });
    }
  }

  for (const d of future) {
    const l = onDay(events, d);
    for (let i = 1; i < l.length; i++) {
      if (l[i].start - l[i - 1].end <= 0 && hoursOf(l[i - 1]) >= 8) {
        out.push({
          id: `gap-${l[i].id}`, urgent: false, icon: Clock,
          head: `Geen pauze op ${dayName(d)}`,
          body: `${l[i].title} begint direct na ${l[i - 1].title}. Een half uur ertussen scheelt veel.`,
          cta: "Half uur later",
          action: { kind: "move", eventId: l[i].id, date: d, start: l[i].start + 0.5 },
        });
      }
    }
  }
  return out;
}

/** het meldingencentrum: voorstellen plus zachte duwtjes */
function meldingen(data, todayIso, s, tips) {
  const out = tips.map((t) => ({ ...t, soort: "voorstel" }));
  const komend = Array.from({ length: 7 }, (_, i) => iso(addDays(parse(todayIso), i)));

  const laatsteSport = data.events
    .filter((e) => e.type === "vrij" && SPORT.test(e.title) && e.date <= todayIso)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const sportGeleden = laatsteSport ? between(laatsteSport.date, todayIso) : null;
  if (sportGeleden === null || sportGeleden >= 4) {
    const doel = bestSlot(data.events, komend, todayIso, s, 1.5, 17);
    if (doel) {
      out.push({
        id: "nudge-sport", soort: "duwtje", icon: Sparkles,
        head: sportGeleden === null ? "Al een tijd niet gesport" : `${sportGeleden} dagen niet gesport`,
        body: `${cap(dayName(doel.date))} om ${hhmm(doel.start)} is er anderhalf uur ruimte. Even sporten?`,
        cta: "Plan sporten",
        action: { kind: "add", date: doel.date, start: doel.start, end: doel.start + 1.5, title: "Sporten", type: "vrij" },
      });
    }
  }

  const leeg = komend.slice(1).find((d) => loadOf(data.events, d) === 0);
  if (leeg) {
    out.push({
      id: `nudge-vrij-${leeg}`, soort: "duwtje", icon: Sun,
      head: `${cap(dayName(leeg))} is helemaal vrij`,
      body: "Geen enkele verplichting die dag. Dagje weg, of iemand afspreken?",
      cta: "Zet er iets in",
      action: { kind: "add", date: leeg, start: 10, end: 16, title: "Dagje weg", type: "vrij" },
    });
  }

  const morgen = iso(addDays(parse(todayIso), 1));
  if (loadOf(data.events, morgen, "verplicht") >= s.fullDay) {
    out.push({
      id: `nudge-morgen-${morgen}`, soort: "duwtje", icon: Clock,
      head: "Morgen wordt een lange dag",
      body: `${loadOf(data.events, morgen, "verplicht")} uur verplicht. Hou de avond licht en plan er niets zwaars achteraan.`,
    });
  }

  return out;
}

/* ================================== opslag ================================= */

const KEY = "dashboard:data";

async function loadLokaal() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(KEY);
      return r?.value ? JSON.parse(r.value) : null;
    }
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function saveLokaal(data) {
  try {
    const json = JSON.stringify(data);
    if (typeof window !== "undefined" && window.storage) { await window.storage.set(KEY, json); return; }
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, json);
  } catch { /* opslag niet beschikbaar */ }
}
async function loadRemote(userId) {
  const { data, error } = await supabase.from("dashboards").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}
async function saveRemote(userId, payload) {
  const { error } = await supabase.from("dashboards")
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}
const heel = (d) => ({
  ...seed(), ...d,
  settings: { ...DEFAULT_SETTINGS, ...(d?.settings || {}) },
  profile: { name: "", kleur: "#57a98b", ...(d?.profile || {}) },
});

/* ================================ onderdelen =============================== */

function Card({ icon: Icon, title, action, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-title"><Icon size={14} strokeWidth={1.7} />{title}</div>
        {action ?? <span className="icon-dim"><Maximize2 size={13} /></span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, up }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-title"><Icon size={14} strokeWidth={1.7} />{label}</div>
        <span className="icon-dim"><MoreHorizontal size={15} /></span>
      </div>
      <div className="card-body">
        <div className="stat-value">{value}</div>
        <div className="delta">
          <span className={`delta-pill ${up ? "up" : "down"}`}>
            {up ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
          </span>
          <span className={up ? "up-text" : "down-text"}>{delta}</span> t.o.v. vorige week
        </div>
      </div>
    </div>
  );
}

function Tip({ x, children }) {
  return <div className="tip-box" style={{ left: `${Math.min(90, Math.max(10, x))}%` }}>{children}</div>;
}

/* je dag per uur, gekleurd naar wat er staat */
function DayChart({ events, date, settings, isToday }) {
  const [hover, setHover] = useState(null);
  const rows = settings.dayEnd - settings.dayStart;
  const hours = Array.from({ length: rows }, (_, i) => settings.dayStart + i);
  const H = 300, ticks = [0, 15, 30, 45, 60];
  const scale = (min) => (min / 60) * 92;
  const now = new Date();
  const nowPos = ((now.getHours() + now.getMinutes() / 60) - settings.dayStart) / rows * 100;

  return (
    <div className="axis-wrap">
      <div className="y-axis" style={{ height: H }}>
        {ticks.map((t) => <span key={t} className="y-label" style={{ bottom: `${scale(t)}%` }}>{t}</span>)}
      </div>
      <div className="axis-col">
        <div className="y-unit">minuten per uur</div>
        <div className="chart-area" style={{ height: H }}>
          <div className="hgrid">
            {ticks.map((t) => <div key={t} className={`hline${t === 0 ? " base" : ""}`} style={{ bottom: `${scale(t)}%` }} />)}
          </div>
          {isToday && nowPos >= 0 && nowPos <= 100 && (
            <div className="now-line" style={{ left: `${nowPos}%` }}><span className="now-label">nu</span></div>
          )}
          <div className="bars" style={{ height: H }}>
            {hours.map((h, i) => {
              const items = onDay(events, date).filter((e) => e.start < h + 1 && e.end > h);
              const per = Object.keys(TYPES).map((t) => ({
                t,
                min: items.filter((e) => e.type === t)
                  .reduce((s, e) => s + (Math.min(e.end, h + 1) - Math.max(e.start, h)) * 60, 0),
              })).filter((x) => x.min > 0);
              return (
                <div key={h} className="bar"
                  onMouseEnter={() => setHover({ i, h, items })} onMouseLeave={() => setHover(null)}>
                  <div className="bar-stack">
                    {per.map((x) => (
                      <div key={x.t} className="bar-seg" style={{ height: `${scale(x.min)}%`, background: TYPES[x.t].chart }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {hover && (
            <Tip x={((hover.i + 0.5) / rows) * 100}>
              <div className="tip-box-head">
                {String(hover.h).padStart(2, "0")}:00 – {String(hover.h + 1).padStart(2, "0")}:00
              </div>
              {hover.items.length === 0
                ? <div className="tip-box-empty">Vrij</div>
                : hover.items.map((e) => (
                  <div key={e.id} className="tip-box-row">
                    <span className="type-dot" style={{ background: TYPES[e.type].color }} />
                    <span>{e.title}</span>
                    <span className="tip-box-meta">{hhmm(e.start)}–{hhmm(e.end)}</span>
                  </div>
                ))}
            </Tip>
          )}
        </div>
        <div className="hour-labels">
          {hours.map((h, i) => (
            <div key={h} className="hour-label">{i % 2 === 0 ? `${String(h).padStart(2, "0")}:00` : ""}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* de hele week in uren, om te zien welke dag ruimte heeft */
function WeekChart({ events, weekDates, todayIso, settings }) {
  const [hover, setHover] = useState(null);
  const H = 300;
  const awake = awakeOf(settings);
  const top = Math.max(4, Math.ceil(Math.max(...weekDates.map((d) => loadOf(events, d)))));
  const scale = (u) => (u / top) * 92;
  const ticks = [0, Math.round(top / 2), top];

  return (
    <div className="axis-wrap">
      <div className="y-axis" style={{ height: H }}>
        {ticks.map((t) => <span key={t} className="y-label" style={{ bottom: `${scale(t)}%` }}>{t}</span>)}
      </div>
      <div className="axis-col">
        <div className="y-unit">uur per dag</div>
        <div className="chart-area" style={{ height: H }}>
          <div className="hgrid">
            {ticks.map((t) => <div key={t} className={`hline${t === 0 ? " base" : ""}`} style={{ bottom: `${scale(t)}%` }} />)}
          </div>
          <div className="bars week-bars" style={{ height: H }}>
            {weekDates.map((d, i) => {
              const v = loadOf(events, d, "verplicht"), k = loadOf(events, d, "klus"), f = loadOf(events, d, "vrij");
              return (
                <div key={d} className="bar"
                  onMouseEnter={() => setHover({ i, d, v, k, f })} onMouseLeave={() => setHover(null)}>
                  <div className="bar-stack">
                    <div className="bar-seg" style={{ height: `${scale(f)}%`, background: TYPES.vrij.chart }} />
                    <div className="bar-seg" style={{ height: `${scale(k)}%`, background: TYPES.klus.chart }} />
                    <div className="bar-seg" style={{ height: `${scale(v)}%`, background: TYPES.verplicht.chart }} />
                  </div>
                </div>
              );
            })}
          </div>
          {hover && (
            <Tip x={((hover.i + 0.5) / weekDates.length) * 100}>
              <div className="tip-box-head">{cap(dayName(hover.d))} {parse(hover.d).getDate()}</div>
              <div className="tip-box-row">
                <span className="type-dot" style={{ background: TYPES.verplicht.color }} />Verplicht
                <span className="tip-box-meta">{hover.v} u</span>
              </div>
              <div className="tip-box-row">
                <span className="type-dot" style={{ background: TYPES.klus.color }} />Huishouden
                <span className="tip-box-meta">{hover.k} u</span>
              </div>
              <div className="tip-box-row">
                <span className="type-dot" style={{ background: TYPES.vrij.color }} />Vrije tijd
                <span className="tip-box-meta">{hover.f} u</span>
              </div>
              <div className="tip-box-foot">{Math.max(0, awake - (hover.v + hover.k + hover.f)).toFixed(1)} uur onbezet</div>
              {onDay(events, hover.d).slice(0, 4).map((e) => (
                <div key={e.id} className="tip-box-row sub">
                  <span>{e.title}</span><span className="tip-box-meta">{hhmm(e.start)}</span>
                </div>
              ))}
            </Tip>
          )}
        </div>
        <div className="hour-labels">
          {weekDates.map((d, i) => (
            <div key={d} className="hour-label" style={{ color: d === todayIso ? "var(--fg)" : undefined }}>
              {DAYS[i]} {parse(d).getDate()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekGrid({ events, weekDates, todayIso, settings, onSelect }) {
  const rows = settings.dayEnd - settings.dayStart;
  return (
    <div className="week">
      <div className="week-hours">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="week-hour">{String(settings.dayStart + i).padStart(2, "0")}</div>
        ))}
      </div>
      <div className="week-days">
        {weekDates.map((d, i) => (
          <div key={d} style={{ minWidth: 0 }}>
            <div className={`week-daylabel${d === todayIso ? " today" : ""}`}>
              {DAYS[i]} <span className="nums">{parse(d).getDate()}</span>
            </div>
            <div className={`week-col${d === todayIso ? " today" : ""}`} style={{ height: rows * 36 }}>
              {Array.from({ length: rows - 1 }).map((_, r) => (
                <div key={r} className="week-line" style={{ top: (r + 1) * 36 }} />
              ))}
              {onDay(events, d).map((e) => {
                const t = TYPES[e.type];
                const top = (Math.max(e.start, settings.dayStart) - settings.dayStart) * 36;
                const h = Math.max(18, (Math.min(e.end, settings.dayEnd) - Math.max(e.start, settings.dayStart)) * 36 - 3);
                return (
                  <button key={e.id} className="event" onClick={() => onSelect(e)}
                    style={{ top, height: h, background: t.soft, borderColor: t.line }}>
                    <div className="event-title">{e.title}</div>
                    {h > 34 && <div className="event-time" style={{ color: t.color }}>{hhmm(e.start)}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* piekuren: op hoeveel dagen van de week een uur bezet is */
function PeakHours({ events, weekDates, settings }) {
  const [hover, setHover] = useState(null);
  const uren = Array.from({ length: settings.dayEnd - settings.dayStart }, (_, i) => settings.dayStart + i);

  // per uur: op welke dagen zit je bezet, en waarmee vooral
  const kolommen = uren.map((h) => {
    const telling = { verplicht: 0, vrij: 0, klus: 0 };
    for (const d of weekDates) {
      const raak = onDay(events, d).filter((e) => e.start < h + 1 && e.end > h);
      if (!raak.length) continue;
      const zwaarste = raak.sort((a, b) =>
        (Math.min(b.end, h + 1) - Math.max(b.start, h)) - (Math.min(a.end, h + 1) - Math.max(a.start, h)))[0];
      telling[zwaarste.type] += 1;
    }
    const dagen = telling.verplicht + telling.vrij + telling.klus;
    return { h, telling, dagen };
  });

  const drukste = Math.max(...kolommen.map((k) => k.dagen));
  const top = Math.max(2, drukste);
  const scale = (n) => (n / top) * 86;
  const ticks = top <= 3 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, Math.round(top / 2), top];

  let piek = 0, beste = -1;
  for (let i = 0; i < kolommen.length - 1; i++) {
    const som = kolommen[i].dagen + kolommen[i + 1].dagen;
    if (som > beste) { beste = som; piek = i; }
  }
  const H = 150;

  if (drukste === 0) {
    return (
      <div className="inset">
        <div className="peak-title">Nog niets gepland</div>
        <p className="peak-sub">Zodra er afspraken in deze week staan, zie je hier op welke uren je meestal bezet bent.</p>
      </div>
    );
  }

  const piekDagen = Math.max(kolommen[piek].dagen, kolommen[piek + 1].dagen);

  return (
    <div className="inset">
      <div className="peak-title">
        {String(kolommen[piek].h).padStart(2, "0")}:00 – {String(kolommen[piek].h + 2).padStart(2, "0")}:00
      </div>
      <p className="peak-sub">
        Op {piekDagen} van de 7 dagen ben je dan bezet — je vastste moment van de week
      </p>
      <div className="axis-wrap">
        <div className="y-axis" style={{ height: H }}>
          {ticks.map((t) => <span key={t} className="y-label" style={{ bottom: `${scale(t)}%` }}>{t}</span>)}
        </div>
        <div className="axis-col">
          <div className="y-unit">dagen bezet</div>
          <div className="chart-area" style={{ height: H }}>
            <div className="hgrid">
              {ticks.map((t) => <div key={t} className={`hline${t === 0 ? " base" : ""}`} style={{ bottom: `${scale(t)}%` }} />)}
            </div>
            <div className="bars" style={{ height: H }}>
              {kolommen.map((k, i) => (
                <div key={k.h} className="bar"
                  onMouseEnter={() => setHover({ i, ...k })} onMouseLeave={() => setHover(null)}>
                  <div className="bar-stack">
                    {Object.entries(k.telling).filter(([, n]) => n > 0).map(([t, n]) => (
                      <div key={t} className="bar-seg" style={{ height: `${scale(n)}%`, background: TYPES[t].chart }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hover && (
              <Tip x={((hover.i + 0.5) / kolommen.length) * 100}>
                <div className="tip-box-head">
                  {String(hover.h).padStart(2, "0")}:00 – {String(hover.h + 1).padStart(2, "0")}:00
                </div>
                {hover.dagen === 0
                  ? <div className="tip-box-empty">Dit uur is de hele week vrij</div>
                  : Object.entries(hover.telling).filter(([, n]) => n > 0).map(([t, n]) => (
                    <div key={t} className="tip-box-row">
                      <span className="type-dot" style={{ background: TYPES[t].color }} />
                      {TYPES[t].label}
                      <span className="tip-box-meta">{n} {n === 1 ? "dag" : "dagen"}</span>
                    </div>
                  ))}
              </Tip>
            )}
          </div>
          <div className="hour-labels">
            {kolommen.map((k, i) => (
              <div key={k.h} className="hour-label">{i % 3 === 0 ? `${String(k.h).padStart(2, "0")}:00` : ""}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoreForm({ onAdd, todayIso }) {
  const [name, setName] = useState("");
  const [every, setEvery] = useState(7);
  const [dur, setDur] = useState(30);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. ramen lappen" />
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, fontSize: 12, color: "var(--dim)" }}>
          Elke … dagen
          <input className="input" type="number" min="1" value={every} style={{ width: "100%", marginTop: 4 }}
            onChange={(e) => setEvery(+e.target.value)} />
        </label>
        <label style={{ flex: 1, fontSize: 12, color: "var(--dim)" }}>
          Duur (min)
          <input className="input" type="number" min="5" step="5" value={dur} style={{ width: "100%", marginTop: 4 }}
            onChange={(e) => setDur(+e.target.value)} />
        </label>
      </div>
      <button className="btn-primary" style={{ justifyContent: "center" }}
        onClick={() => { if (!name.trim()) return; onAdd({ id: uid(), name: name.trim(), every, dur: dur / 60, last: todayIso }); setName(""); }}>
        Klus toevoegen
      </button>
      <p style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
        Zodra een klus over tijd is, zoekt het dashboard zelf een dag met ruimte en stelt die voor.
      </p>
    </div>
  );
}

/* alles wat je hoofd nog vasthoudt, zonder dat het al een moment heeft */
function InboxPanel({ inbox, todayIso, onAdd, onPlan, onRemove }) {
  const [text, setText] = useState("");
  const [dur, setDur] = useState(30);
  const submit = () => { onAdd(text, dur / 60); setText(""); };
  return (
    <div>
      <div className="inbox-form">
        <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Wat zit er in je hoofd?"
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <select className="select" value={dur} onChange={(e) => setDur(+e.target.value)}>
          {[10, 20, 30, 60, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        <button className="btn-primary" onClick={submit}>Vang op</button>
      </div>
      {inbox.length === 0 ? (
        <p className="empty-sub" style={{ margin: "16px 0 0", textAlign: "left" }}>
          Leeg. Gooi hier alles in wat nog geen moment heeft — het dashboard zoekt er zelf een dag bij.
        </p>
      ) : (
        <div className="inbox-list">
          {inbox.map((i) => {
            const oud = between(i.created, todayIso);
            return (
              <div key={i.id} className="inbox-row">
                <span className="inbox-text">{i.text}</span>
                <span className={`chore-meta${oud > 4 ? " late" : ""}`}>{oud === 0 ? "vandaag" : oud + "d"}</span>
                <span className="chore-meta">{Math.round(i.dur * 60)} min</span>
                <button className="btn btn-sm" onClick={() => onPlan(i)}>Plan in</button>
                <button className="icon-dim" onClick={() => onRemove(i.id)}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* velden om iets toe te voegen of te wijzigen */
function EventForm({ value, onChange, onZoek }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="input" autoFocus placeholder="Wat ga je doen?" value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })} />
      <div style={{ display: "flex", gap: 8 }}>
        <select className="select" style={{ flex: 1 }} value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}>
          {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
        <input className="input" style={{ flex: 1 }} type="date" value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" style={{ flex: 1 }} type="time" value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })} />
        <input className="input" style={{ flex: 1 }} type="time" value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })} />
      </div>
      {onZoek && value.type !== "verplicht" && (
        <button className="btn" style={{ justifyContent: "center" }} onClick={onZoek}>
          <Wand2 size={13} /> Zoek een moment voor me
        </button>
      )}
    </div>
  );
}

/* je naam, je kleur en je inloggegevens */
function ProfielForm({ profile, user, onChange, onEmail, onWachtwoord }) {
  const [naam, setNaam] = useState(profile.name || "");
  const [mail, setMail] = useState(user?.email || "");
  const [pw, setPw] = useState("");
  const KLEUREN = ["#57a98b", "#6d7cb8", "#bf9755", "#b5697a", "#7d8a99", "#8a76b8"];

  return (
    <div className="grid-half">
      <Card icon={Settings} title="Hoe je heet" action={<span />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="avatar big" style={{ background: profile.kleur }}>
              {(naam || user?.email || "?").trim().charAt(0).toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <input className="input" style={{ width: "100%" }} placeholder="Je naam"
                value={naam} onChange={(e) => setNaam(e.target.value)}
                onBlur={() => onChange({ ...profile, name: naam.trim() })} />
              <div className="setting-hint" style={{ marginTop: 6 }}>
                Wordt gebruikt in de begroeting en op je bolletje rechtsboven.
              </div>
            </div>
          </div>
          <div>
            <div className="setting-label" style={{ marginBottom: 8 }}>Kleur</div>
            <div className="kleuren">
              {KLEUREN.map((k) => (
                <button key={k} className={`kleur${profile.kleur === k ? " aan" : ""}`}
                  style={{ background: k }} onClick={() => onChange({ ...profile, kleur: k })} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card icon={LogOut} title="Inloggegevens" action={<span />}>
        {!user ? (
          <p className="empty-sub" style={{ textAlign: "left", margin: 0 }}>
            Je werkt in lokale modus, dus er is geen account om aan te passen. Zet de Supabase-sleutels
            in je omgeving en je kunt hier je e-mailadres en wachtwoord wijzigen.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="setting-label">E-mailadres</div>
              <div className="setting-hint" style={{ marginBottom: 8 }}>
                Je krijgt een bevestigingsmail op het nieuwe adres voordat het verandert.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" style={{ flex: 1 }} type="email" value={mail}
                  onChange={(e) => setMail(e.target.value)} />
                <button className="btn" onClick={() => onEmail(mail)}>Wijzig</button>
              </div>
            </div>
            <div>
              <div className="setting-label">Wachtwoord</div>
              <div className="setting-hint" style={{ marginBottom: 8 }}>Minstens zes tekens.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" style={{ flex: 1 }} type="password" placeholder="Nieuw wachtwoord"
                  value={pw} onChange={(e) => setPw(e.target.value)} />
                <button className="btn" onClick={() => { onWachtwoord(pw); setPw(""); }}>Wijzig</button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* =================================== app =================================== */

export default function Dashboard() {
  const router = useRouter();
  const today = new Date();
  const todayIso = iso(today);
  const yesterdayIso = iso(addDays(today, -1));

  const [view, setView] = useState("dashboard");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(seed);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(heeftSupabase ? "laden" : "lokaal");
  const [dismissed, setDismissed] = useState([]);
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [chartMode, setChartMode] = useState("dag");
  const [quickOpen, setQuickOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [belOpen, setBelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedTekst, setFeedTekst] = useState(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", type: "vrij", date: todayIso, start: "19:00", end: "20:00" });
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  const weekStart = startOfWeek(addDays(today, offset * 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));

  useEffect(() => {
    let actief = true;
    (async () => {
      if (!heeftSupabase) {
        const d = await loadLokaal();
        if (actief && d) setData(heel(d));
        setReady(true);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { router.replace("/login"); return; }
      setUser(sess.session.user);
      setStatus("online");
      try {
        const d = await loadRemote(sess.session.user.id);
        if (actief && d) setData(heel(d));
      } catch { setStatus("fout"); }
      setReady(true);
    })();
    return () => { actief = false; };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (user) saveRemote(user.id, data).catch(() => setStatus("fout"));
      else saveLokaal(data);
    }, 600);
  }, [data, ready, user]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setQuery(""); setPaletteOpen(true); }
      else if (mod && e.key === ".") { e.preventDefault(); openQuick(); }
      else if (e.key === "Escape") { setPaletteOpen(false); setQuickOpen(false); setSelected(null); setEdit(null); setBelOpen(false); setMenuOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const geleerd = useMemo(() => patronen(data.events, todayIso), [data.events, todayIso]);
  const genegeerd = data.genegeerd || [];
  const tips = useMemo(
    () => suggest(data.events, data.chores, data.inbox, weekDates, todayIso, settings, geleerd, genegeerd)
      .filter((s) => !dismissed.includes(s.id)),
    [data, weekDates.join(","), dismissed, todayIso, geleerd]
  );
  const alleMeldingen = useMemo(
    () => meldingen(data, todayIso, settings, tips).filter((m) => !dismissed.includes(m.id)),
    [data, tips, dismissed, todayIso]
  );

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  function accept(s) {
    const a = s.action;
    if (!a) { setDismissed((d) => [...d, s.id]); return; }
    setData((p) => {
      if (a.kind === "move") {
        const ev = p.events.find((e) => e.id === a.eventId);
        const dur = hoursOf(ev);
        return { ...p, events: p.events.map((e) => e.id === a.eventId ? { ...e, date: a.date, start: a.start, end: a.start + dur } : e) };
      }
      if (a.kind === "inbox") {
        return {
          ...p,
          inbox: (p.inbox || []).filter((x) => x.id !== a.item.id),
          events: [...p.events, { id: uid(), date: a.date, start: a.start, end: a.start + a.item.dur, title: a.item.text, type: "klus" }],
        };
      }
      if (a.kind === "chore") {
        return { ...p, events: [...p.events, { id: uid(), choreId: a.chore.id, date: a.date, start: a.start, end: a.start + a.chore.dur, title: a.chore.name, type: "klus" }] };
      }
      return { ...p, events: [...p.events, { id: uid(), ...a }] };
    });
    setDismissed((d) => [...d, s.id]);
    flash("Ingepland");
  }

  function openQuick(type = "vrij") {
    const dur = type === "vrij" ? 1.5 : 1;
    const voorstel = bestSlot(data.events, weekDates, todayIso, settings, dur, type === "vrij" ? 17 : 9);
    setDraft({
      title: "", type,
      date: voorstel ? voorstel.date : todayIso,
      start: voorstel ? hhmm(voorstel.start) : "19:00",
      end: voorstel ? hhmm(voorstel.start + dur) : "20:00",
    });
    setQuickOpen(true);
  }
  function zoekMoment(d, setter) {
    const dur = Math.max(0.5, toH(d.end) - toH(d.start));
    const voorstel = bestSlot(data.events, weekDates, todayIso, settings, dur, d.type === "vrij" ? 17 : 9);
    if (!voorstel) { flash("Deze week is er geen ruimte voor"); return; }
    setter({ ...d, date: voorstel.date, start: hhmm(voorstel.start), end: hhmm(voorstel.start + dur) });
    flash(`Voorstel: ${dayName(voorstel.date)} om ${hhmm(voorstel.start)}`);
  }

  /** herkent wat je typt en vult dag en tijd in zoals je het meestal doet */
  function patroonVoor(titel) {
    const t = normTitel(titel || "");
    if (t.length < 3) return null;
    return geleerd.find((p) => p.key === t || p.key.includes(t) || t.includes(p.key)) || null;
  }
  function neemPatroonOver(p, d, setter) {
    const dag = volgendeDag(weekDates, todayIso, p.dag) || weekDates.find((x) => x >= todayIso) || weekDates[0];
    setter({ ...d, title: p.titel, type: p.type, date: dag, start: hhmm(p.start), end: hhmm(p.start + p.dur) });
    flash(`Zoals gewoonlijk: ${FULL[p.dag]} om ${hhmm(p.start)}`);
  }

  function addEvent(close) {
    if (!draft.title.trim()) return;
    setData((p) => ({ ...p, events: [...p.events, { id: uid(), date: draft.date, start: toH(draft.start), end: toH(draft.end), title: draft.title.trim(), type: draft.type }] }));
    setDraft({ ...draft, title: "" });
    if (close) setQuickOpen(false);
    flash(`Staat op ${dayName(draft.date)} ${parse(draft.date).getDate()}`);
  }

  function saveEdit() {
    setData((p) => ({
      ...p,
      events: p.events.map((e) => e.id === edit.id
        ? { ...e, title: edit.title.trim() || e.title, type: edit.type, date: edit.date, start: toH(edit.start), end: toH(edit.end) }
        : e),
    }));
    setEdit(null); setSelected(null);
    flash("Wijziging opgeslagen");
  }

  function choreDone(c) {
    setData((p) => ({
      ...p,
      chores: p.chores.map((x) => x.id === c.id ? { ...x, last: todayIso } : x),
      events: p.events.filter((e) => e.choreId !== c.id),
    }));
    flash(`${c.name} afgevinkt`);
  }
  function addToInbox(text, dur) {
    if (!text.trim()) return;
    setData((p) => ({ ...p, inbox: [...(p.inbox || []), { id: uid(), text: text.trim(), dur, created: todayIso }] }));
    flash("In je opvangbak gezet");
  }
  function planInbox(item) {
    const doel = bestSlot(data.events, weekDates, todayIso, settings, item.dur, 9);
    if (!doel) { flash("Deze week is er geen ruimte voor"); return; }
    setData((p) => ({
      ...p,
      inbox: p.inbox.filter((x) => x.id !== item.id),
      events: [...p.events, { id: uid(), date: doel.date, start: doel.start, end: doel.start + item.dur, title: item.text, type: "klus" }],
    }));
    flash(`${cap(dayName(doel.date))} om ${hhmm(doel.start)}`);
  }

  const setSetting = (k, v) => setData((p) => ({ ...p, settings: { ...settings, [k]: v } }));

  function exportIcs() {
    const ics = buildIcs(data.events, profile.name ? `Dashboard van ${profile.name}` : "Dashboard");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = "dashboard.ics"; a.click();
    URL.revokeObjectURL(url);
    flash("Open het bestand om het aan Apple Agenda toe te voegen");
  }
  function feedAdres(soort) {
    let token = data.feedToken;
    if (!token) {
      token = Array.from({ length: 5 }, () => Math.random().toString(36).slice(2, 8)).join("");
      setData((p) => ({ ...p, feedToken: token }));
    }
    const host = typeof window !== "undefined" ? window.location.host : "";
    return `webcal://${host}/api/agenda/${token}${soort ? "-" + soort : ""}.ics`;
  }
  async function kopieerFeed(soort) {
    const adres = feedAdres(soort);
    setFeedTekst(adres);
    try { await navigator.clipboard.writeText(adres); flash(soort ? `Adres voor ${TYPES[soort].label} gekopieerd` : "Adres gekopieerd"); }
    catch { flash("Kopieer het adres hieronder"); }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dashboard.json"; a.click();
    URL.revokeObjectURL(url);
    flash("Bestand gedownload");
  }
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try { setData(heel(JSON.parse(reader.result))); flash("Gegevens geladen"); }
      catch { flash("Dit bestand kon ik niet lezen"); }
    };
    reader.readAsText(file);
  }
  const profile = { name: "", kleur: "#57a98b", ...(data.profile || {}) };
  const initiaal = (profile.name || user?.email || "?").trim().charAt(0).toUpperCase();

  async function wijzigEmail(nieuw) {
    if (!heeftSupabase || !nieuw.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: nieuw.trim() });
    flash(error ? "Dat lukte niet: " + error.message : "Check je mail om te bevestigen");
  }
  async function wijzigWachtwoord(nieuw) {
    if (!heeftSupabase) return;
    if (!nieuw || nieuw.length < 6) { flash("Minstens zes tekens"); return; }
    const { error } = await supabase.auth.updateUser({ password: nieuw });
    flash(error ? "Dat lukte niet: " + error.message : "Wachtwoord gewijzigd");
  }

  async function uitloggen() {
    if (!heeftSupabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const verplichtWeek = weekDates.reduce((s, d) => s + loadOf(data.events, d, "verplicht"), 0);
  const vrijWeek = weekDates.reduce((s, d) => s + loadOf(data.events, d, "vrij"), 0);
  const klusWeek = weekDates.reduce((s, d) => s + loadOf(data.events, d, "klus"), 0);
  const achter = data.chores.filter((c) => between(c.last, todayIso) > c.every).length;
  const balans = verplichtWeek + vrijWeek ? Math.round((vrijWeek / (verplichtWeek + vrijWeek)) * 100) : 0;
  const bezetVandaag = loadOf(data.events, todayIso);
  const bezetGisteren = loadOf(data.events, yesterdayIso);
  const awake = awakeOf(settings);
  const pct = Math.round((bezetVandaag / awake) * 100);
  const verschil = bezetGisteren ? Math.round(((bezetVandaag - bezetGisteren) / bezetGisteren) * 100) : 0;
  const drukste = weekDates.reduce((a, b) => loadOf(data.events, a, "verplicht") >= loadOf(data.events, b, "verplicht") ? a : b);
  const rustigste = weekDates.reduce((a, b) => freeCap(data.events, a, settings) >= freeCap(data.events, b, settings) ? a : b);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "klussen", label: "Huishouden", icon: Megaphone },
    { id: "ritme", label: "Ritme", icon: BarChart3 },
    { id: "opvangbak", label: "Opvangbak", icon: Inbox },
    { id: "patronen", label: "Gewoontes", icon: Repeat },
    { id: "koppelingen", label: "Koppelingen", icon: Plug },
  ];

  const q = query.trim().toLowerCase();
  const paletteViews = [...nav, { id: "profiel", label: "Profiel", icon: Settings }, { id: "hulp", label: "Hulp", icon: LifeBuoy }, { id: "instellingen", label: "Instellingen", icon: Settings }]
    .filter((n) => !q || n.label.toLowerCase().includes(q));
  const paletteEvents = data.events.filter((e) => q && e.title.toLowerCase().includes(q)).slice(0, 6);
  const paletteChores = data.chores.filter((c) => q && c.name.toLowerCase().includes(q)).slice(0, 5);
  const openView = (id) => { setView(id); setPaletteOpen(false); };

  if (heeftSupabase && status === "laden") {
    return <div className="laden">Even je week ophalen…</div>;
  }

  return (
    <div className="app" onClick={() => { if (belOpen) setBelOpen(false); if (menuOpen) setMenuOpen(false); }}>
      <div className="topbar">
        <div className="topbar-left">
          <Blocks size={17} />
          <div className="divider-v" />
          <button className="workspace" onClick={() => setView("dashboard")}>
            <span className="workspace-dot" />
            <span className="workspace-name">Dashboard</span>
            <ChevronDown size={13} className="dim" />
          </button>
        </div>
        <div className="topbar-right">
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="bell" onClick={() => setBelOpen(!belOpen)} title="Meldingen">
              <Bell size={17} />
              {alleMeldingen.length > 0 && <span className="bell-badge">{alleMeldingen.length}</span>}
            </button>
            {belOpen && (
              <div className="bell-panel">
                <div className="bell-head">
                  <span>Meldingen</span>
                  {alleMeldingen.length > 0 && (
                    <button className="bell-clear" onClick={() => setDismissed((d) => [...d, ...alleMeldingen.map((m) => m.id)])}>
                      Alles wegwerken
                    </button>
                  )}
                </div>
                <div className="bell-list">
                  {alleMeldingen.length === 0 ? (
                    <div className="bell-empty">Niets te melden. Je week loopt.</div>
                  ) : alleMeldingen.map((m) => {
                    const Icon = m.icon || Sparkles;
                    return (
                      <div key={m.id} className="bell-item">
                        <span className={`bell-icon${m.urgent ? " urgent" : ""}`}><Icon size={14} strokeWidth={1.8} /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="bell-title">{m.head}</div>
                          <p className="bell-body">{m.body}</p>
                          <div className="bell-actions">
                            {m.cta && (
                              <button className="btn-primary btn-sm" onClick={() => { accept(m); setBelOpen(false); }}>
                                <Check size={11} strokeWidth={2.5} /> {m.cta}
                              </button>
                            )}
                            <button className="btn btn-sm" onClick={() => setDismissed((d) => [...d, m.id])}>Weg</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="avatar" style={{ background: profile.kleur }}
              onClick={() => setMenuOpen(!menuOpen)} title="Profiel">
              {initiaal}
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <div className="menu-head">
                  <span className="avatar" style={{ background: profile.kleur }}>{initiaal}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="menu-naam">{profile.name || "Naamloos"}</div>
                    <div className="menu-mail">{user ? user.email : "lokale modus"}</div>
                  </div>
                </div>
                <button className="menu-item" onClick={() => { setView("profiel"); setMenuOpen(false); }}>
                  <Settings size={14} /> Profiel bewerken
                </button>
                <button className="menu-item" onClick={() => { setView("instellingen"); setMenuOpen(false); }}>
                  <SlidersHorizontal size={14} /> Instellingen
                </button>
                {user && (
                  <button className="menu-item danger" onClick={uitloggen}>
                    <LogOut size={14} /> Uitloggen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shell">
        <aside className={`sidebar${compact ? " compact" : ""}`}>
          <button className="search" onClick={() => { setQuery(""); setPaletteOpen(true); }}>
            <Search size={14} /> <span>Zoeken…</span>
            <span className="keys"><kbd>⌘</kbd><kbd>K</kbd></span>
          </button>
          {nav.map((n) => (
            <button key={n.id} className={`nav-item${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)} title={n.label}>
              <n.icon size={15} strokeWidth={1.7} /><span className="nav-label">{n.label}</span>
            </button>
          ))}
          <div className="sidebar-bottom">
            <button className={`nav-item${view === "hulp" ? " active" : ""}`} onClick={() => setView("hulp")} title="Hulp">
              <LifeBuoy size={15} strokeWidth={1.7} /><span className="nav-label">Hulp</span>
            </button>
            <button className={`nav-item${view === "instellingen" ? " active" : ""}`} onClick={() => setView("instellingen")} title="Instellingen">
              <Settings size={15} strokeWidth={1.7} /><span className="nav-label">Instellingen</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12 }}>
              <button className="customizer" onClick={() => openQuick()} title="Snel toevoegen">
                <SlidersHorizontal size={16} className="muted" />
                <div style={{ textAlign: "left" }}>
                  <div className="customizer-title">Snel toevoegen</div>
                  <div className="customizer-sub">Werk, sport, klus</div>
                </div>
                <kbd>⌘.</kbd>
              </button>
              <button className="icon-dim" onClick={() => setCompact(!compact)} title="Zijbalk in- of uitklappen">
                <PanelLeft size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="grid-stats">
            <StatCard icon={Megaphone} label="Verplichte uren" value={verplichtWeek} delta="12,4%" up />
            <StatCard icon={Calendar} label="Vrije uren" value={vrijWeek} delta="7,8%" up={vrijWeek >= settings.minVrij} />
            <StatCard icon={Globe} label="Klussen open" value={achter} delta="4,3%" up={achter === 0} />
            <StatCard icon={BarChart3} label="Balans" value={`${balans}%`} delta="0,6%" up={balans >= 25} />
          </div>

          {view === "dashboard" && (
            <>
              <div className="section-head">
                <h2 className="section-title">{profile.name ? `Vandaag, ${profile.name}` : "Vandaag"}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => setView("agenda")}>
                    <SlidersHorizontal size={14} /> Week bekijken
                  </button>
                  <button className="btn btn-icon" onClick={() => openQuick()} title="Snel toevoegen"><Plus size={14} /></button>
                </div>
              </div>

              <div className="grid-main">
                <Card icon={TrendingUp} title={chartMode === "dag" ? "Je dag" : "Je week"}
                  action={
                    <div className="seg">
                      <button className={chartMode === "dag" ? "on" : ""} onClick={() => setChartMode("dag")}>Dag</button>
                      <button className={chartMode === "week" ? "on" : ""} onClick={() => setChartMode("week")}>Week</button>
                    </div>
                  }>
                  <div className="inset">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="chart-legend">
                        <div>
                          <div className="legend-label"><span className="legend-dot" style={{ background: TYPES.verplicht.color }} /> Bezet</div>
                          <div className="legend-value">
                            {chartMode === "dag" ? bezetVandaag.toFixed(1) : (verplichtWeek + vrijWeek + klusWeek).toFixed(0)} u
                          </div>
                        </div>
                        <div>
                          <div className="legend-label"><span className="legend-dot" style={{ background: TYPES.vrij.color }} /> Nog vrij</div>
                          <div className="legend-value">
                            {chartMode === "dag"
                              ? Math.max(0, awake - bezetVandaag).toFixed(1)
                              : Math.max(0, awake * 7 - (verplichtWeek + vrijWeek + klusWeek)).toFixed(0)} u
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, justifyContent: "flex-end" }}>
                          <span className={`delta-pill ${verschil >= 0 ? "up" : "down"}`}>
                            {verschil >= 0 ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
                          </span>
                          <span className={verschil >= 0 ? "up-text" : "down-text"}>{Math.abs(verschil)}%</span>
                        </div>
                        <div className="dim" style={{ fontSize: 11.5, marginTop: 4 }}>t.o.v. gisteren</div>
                      </div>
                    </div>
                    {chartMode === "dag"
                      ? <DayChart events={data.events} date={todayIso} settings={settings} isToday />
                      : <WeekChart events={data.events} weekDates={weekDates} todayIso={todayIso} settings={settings} />}
                    <div className="chart-key">
                      {Object.entries(TYPES).map(([k, t]) => (
                        <span key={k}><span className="type-dot" style={{ background: t.color }} />{t.label}</span>
                      ))}
                    </div>
                  </div>
                </Card>

                <div className="stack">
                  <Card icon={PieChart} title="Ruimte vandaag">
                    <div className="inset">
                      <div className="split">
                        <div>
                          <div className="muted" style={{ fontSize: 13 }}>Bezet</div>
                          <div className="stat-value sm nums" style={{ marginTop: 6 }}>{bezetVandaag.toFixed(1)} u</div>
                        </div>
                        <div className="split-line" />
                        <div style={{ textAlign: "right", paddingLeft: 16 }}>
                          <div className="muted" style={{ fontSize: 13 }}>Wakkere uren</div>
                          <div className="stat-value sm nums" style={{ marginTop: 6 }}>{awake} u</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 26 }}>
                        <div className="usage-pct">{pct}% gevuld</div>
                        <div className="usage-track">
                          <div className="usage-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                          <div className="usage-marker" style={{ left: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="usage-foot">
                          <span>{loadOf(data.events, todayIso, "verplicht")} u verplicht</span>
                          <span>{loadOf(data.events, todayIso, "vrij")} u vrij</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card icon={Clock} title="Piekuren">
                    <PeakHours events={data.events} weekDates={weekDates} settings={settings} />
                  </Card>
                </div>
              </div>

              <div className="grid-main" style={{ marginTop: 12 }}>
                <Card icon={Calendar} title="Vandaag ingepland" action={<span />}>
                  {onDay(data.events, todayIso).length === 0 ? (
                    <div className="dim" style={{ fontSize: 13 }}>Niets gepland. De hele dag is van jou.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {onDay(data.events, todayIso).map((e) => (
                        <button key={e.id} className="row-item" onClick={() => setSelected(e)}>
                          <span className="row-time">{hhmm(e.start)} – {hhmm(e.end)}</span>
                          <span className="type-dot" style={{ background: TYPES[e.type].color }} />
                          <span>{e.title}</span>
                          <span className="row-tag">{TYPES[e.type].label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="divider-top dim" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    Iets toevoegen doe je met de knop rechtsboven, of met ⌘.
                  </div>
                </Card>

                <Card icon={Clock} title="Huishouden" action={<span />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {data.chores.map((c) => {
                      const g = between(c.last, todayIso);
                      return (
                        <div key={c.id} className="chore-row">
                          <button className="chore-check" onClick={() => choreDone(c)}><Check size={11} strokeWidth={3} /></button>
                          <span className="chore-name">{c.name}</span>
                          <span className={`chore-meta${g > c.every ? " late" : ""}`}>{g}d / {c.every}d</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </>
          )}

          {view === "agenda" && (
            <>
              <div className="section-head">
                <h2 className="section-title">
                  Week van {parse(weekDates[0]).getDate()} {parse(weekDates[0]).toLocaleDateString("nl-NL", { month: "long" })}
                </h2>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-icon" onClick={() => setOffset(offset - 1)}><ChevronLeft size={14} /></button>
                  <button className="btn" onClick={() => setOffset(0)}>deze week</button>
                  <button className="btn btn-icon" onClick={() => setOffset(offset + 1)}><ChevronRight size={14} /></button>
                  <button className="btn" onClick={() => {
                    const d = weekDates.find((x) => x >= todayIso) || weekDates[0];
                    setDraft({ title: "", type: "vrij", date: d, start: "19:00", end: "20:00" });
                    setQuickOpen(true);
                  }}><Plus size={14} /> In deze week</button>
                </div>
              </div>
              <Card icon={Calendar} title="Weekplanner"
                action={
                  <div style={{ display: "flex", gap: 14 }}>
                    {Object.entries(TYPES).map(([k, t]) => (
                      <span key={k} className="dim" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                        <span className="type-dot" style={{ background: t.color }} />{t.label}
                      </span>
                    ))}
                  </div>
                }>
                <WeekGrid events={data.events} weekDates={weekDates} todayIso={todayIso} settings={settings} onSelect={setSelected} />
              </Card>
            </>
          )}

          {view === "klussen" && (
            <div className="grid-half" style={{ marginTop: 24 }}>
              <Card icon={Megaphone} title="Terugkerende klussen" action={<span />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.chores.map((c) => {
                    const g = between(c.last, todayIso), p = Math.min(100, (g / c.every) * 100);
                    return (
                      <div key={c.id} className="chore-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 13.5 }}>{c.name}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button className="btn btn-sm" onClick={() => choreDone(c)}>Net gedaan</button>
                            <button className="icon-dim" onClick={() => setData((p2) => ({ ...p2, chores: p2.chores.filter((x) => x.id !== c.id) }))}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="track"><div className="track-fill" style={{ width: `${p}%`, background: p >= 100 ? TYPES.klus.color : "#52525b" }} /></div>
                        <div className="chore-meta" style={{ marginTop: 8 }}>{g} dagen geleden · elke {c.every} dagen · {Math.round(c.dur * 60)} min</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card icon={SlidersHorizontal} title="Klus toevoegen" action={<span />}>
                <ChoreForm todayIso={todayIso} onAdd={(c) => { setData((p) => ({ ...p, chores: [...p.chores, c] })); flash("Klus toegevoegd"); }} />
              </Card>
            </div>
          )}

          {view === "opvangbak" && (
            <div style={{ marginTop: 24 }}>
              <Card icon={Inbox} title="Opvangbak"
                action={<span className="dim" style={{ fontSize: 11.5 }}>{(data.inbox || []).length} open</span>}>
                <InboxPanel inbox={data.inbox || []} todayIso={todayIso} onAdd={addToInbox} onPlan={planInbox}
                  onRemove={(id) => setData((p) => ({ ...p, inbox: p.inbox.filter((x) => x.id !== id) }))} />
              </Card>
            </div>
          )}

          {view === "ritme" && (
            <div className="grid-half" style={{ marginTop: 24 }}>
              <Card icon={BarChart3} title="Verplicht tegenover vrij" action={<span />}>
                <WeekChart events={data.events} weekDates={weekDates} todayIso={todayIso} settings={settings} />
              </Card>
              <Card icon={Clock} title="Wat opvalt" action={<span />}>
                <ul className="insight-list">
                  <li>Zwaarste dag: <b>{cap(dayName(drukste))}</b> met {loadOf(data.events, drukste, "verplicht")} verplichte uren.</li>
                  <li>Rustigste dag: <b>{cap(dayName(rustigste))}</b> — goede plek voor sport of klussen.</li>
                  <li>Deze week: <b>{verplichtWeek} u verplicht</b>, <b>{vrijWeek} u vrij</b>, <b>{klusWeek} u huishouden</b>.</li>
                  <li>{achter ? `${achter} klus${achter > 1 ? "sen" : ""} over tijd.` : "Het huishouden loopt op schema."}</li>
                </ul>
              </Card>
            </div>
          )}

          {view === "instellingen" && (
            <div className="grid-half" style={{ marginTop: 24 }}>
              <Card icon={Settings} title="Hoe het dashboard rekent" action={<span />}>
                <div className="setting">
                  <div>
                    <div className="setting-label">Wakkere uren</div>
                    <div className="setting-hint">Binnen dit venster wordt naar ruimte gezocht.</div>
                  </div>
                  <div className="setting-control">
                    <input className="input" type="number" min="0" max="12" value={settings.dayStart}
                      onChange={(e) => setSetting("dayStart", Math.min(+e.target.value, settings.dayEnd - 4))} />
                    <span className="dim">tot</span>
                    <input className="input" type="number" min="12" max="24" value={settings.dayEnd}
                      onChange={(e) => setSetting("dayEnd", Math.max(+e.target.value, settings.dayStart + 4))} />
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Een dag is vol vanaf</div>
                    <div className="setting-hint">Boven dit aantal verplichte uren wordt voorgesteld om vrije tijd te verplaatsen.</div>
                  </div>
                  <div className="setting-control">
                    <input className="input" type="number" min="4" max="16" value={settings.fullDay}
                      onChange={(e) => setSetting("fullDay", +e.target.value)} />
                    <span className="dim">uur</span>
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Vrije uren per week, minimaal</div>
                    <div className="setting-hint">Kom je eronder, dan krijg je een voorstel om tijd voor jezelf te blokken.</div>
                  </div>
                  <div className="setting-control">
                    <input className="input" type="number" min="0" max="40" value={settings.minVrij}
                      onChange={(e) => setSetting("minVrij", +e.target.value)} />
                    <span className="dim">uur</span>
                  </div>
                </div>
              </Card>

              <Card icon={CalendarPlus} title="Apple Agenda" action={<span />}>
                <div className="setting">
                  <div>
                    <div className="setting-label">Eenmalig overzetten</div>
                    <div className="setting-hint">
                      Downloadt een .ics met al je afspraken. Dubbelklik het bestand en Apple Agenda
                      voegt ze toe. Latere wijzigingen komen niet mee.
                    </div>
                  </div>
                  <div className="setting-control">
                    <button className="btn btn-sm" onClick={exportIcs}><Download size={13} /> Download .ics</button>
                  </div>
                </div>
                <div className="setting">
                  <div style={{ width: "100%" }}>
                    <div className="setting-label">Live meekijken</div>
                    <div className="setting-hint">
                      {user
                        ? "Abonneer Apple Agenda op dit adres, dan ververst je week zichzelf. In Agenda: Archief → Nieuw agenda-abonnement, adres plakken."
                        : "Hiervoor moet je ingelogd zijn, want de feed haalt je week uit de database."}
                    </div>
                    {user && <code className="feed">{feedTekst || (data.feedToken ? feedAdres() : "adres verschijnt zodra je kopieert")}</code>}
                    <div className="feed-knoppen">
                      <button className="btn btn-sm" disabled={!user} onClick={() => kopieerFeed()}>
                        <Copy size={13} /> Alles
                      </button>
                      {Object.entries(TYPES).map(([k, t]) => (
                        <button key={k} className="btn btn-sm" disabled={!user} onClick={() => kopieerFeed(k)}>
                          <span className="type-dot" style={{ background: t.color }} /> {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="setting-hint" style={{ marginTop: 10 }}>
                      Eén abonnement krijgt in Apple Agenda één kleur. Wil je kleur per soort, abonneer je dan
                      op de drie losse adressen in plaats van op Alles — dan geef je elke agenda daar zijn eigen kleur.
                    </div>
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Nieuw adres maken</div>
                    <div className="setting-hint">
                      Wie het adres heeft, kan je agenda lezen. Twijfel je, maak dan een nieuw adres —
                      oude abonnementen werken daarna niet meer.
                    </div>
                  </div>
                  <div className="setting-control">
                    <button className="btn btn-sm danger" disabled={!user}
                      onClick={() => { setData((p) => ({ ...p, feedToken: null })); flash("Adres vervalt, kopieer een nieuw"); }}>
                      Vervang
                    </button>
                  </div>
                </div>
              </Card>

              <Card icon={Download} title="Je account en gegevens" action={<span />}>
                <div className="setting">
                  <div>
                    <div className="setting-label">{user ? user.email : "Lokale modus"}</div>
                    <div className="setting-hint">
                      {user
                        ? "Je week staat in de database en komt terug op elk apparaat waar je inlogt."
                        : "Er zijn geen Supabase-sleutels ingesteld, dus alles blijft in deze browser."}
                    </div>
                  </div>
                  <div className="setting-control">
                    {user
                      ? <button className="btn btn-sm" onClick={uitloggen}><LogOut size={13} /> Uitloggen</button>
                      : <span className={`badge${status === "fout" ? " fout" : ""}`}>{status === "fout" ? "opslagfout" : "lokaal"}</span>}
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Meenemen naar een ander apparaat</div>
                    <div className="setting-hint">Download een kopie of laad er een terug.</div>
                  </div>
                  <div className="setting-control">
                    <button className="btn btn-sm" onClick={exportJson}><Download size={13} /> Downloaden</button>
                    <button className="btn btn-sm" onClick={() => fileRef.current?.click()}><Upload size={13} /> Laden</button>
                    <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
                      onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Opnieuw beginnen</div>
                    <div className="setting-hint">Zet alles terug naar de voorbeeldweek. Dit kun je niet ongedaan maken.</div>
                  </div>
                  <div className="setting-control">
                    <button className="btn btn-sm danger" onClick={() => { setData(seed()); setDismissed([]); flash("Alles teruggezet"); }}>
                      Alles wissen
                    </button>
                  </div>
                </div>
                <div className="setting">
                  <div>
                    <div className="setting-label">Meldingen terughalen</div>
                    <div className="setting-hint">Je hebt er {dismissed.length} weggewerkt deze sessie.</div>
                  </div>
                  <div className="setting-control">
                    <button className="btn btn-sm" onClick={() => { setDismissed([]); flash("Ze staan er weer"); }}>Terughalen</button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {view === "patronen" && (
            <div style={{ marginTop: 24 }}>
              <Card icon={Repeat} title="Wat het dashboard van je geleerd heeft"
                action={<span className="dim" style={{ fontSize: 11.5 }}>{geleerd.length} gewoontes</span>}>
                {geleerd.length === 0 ? (
                  <div className="empty">
                    <div className="empty-title">Nog te weinig geschiedenis</div>
                    <p className="empty-sub">
                      Zodra iets drie keer in je agenda heeft gestaan, herkent het dashboard het als gewoonte
                      en stelt het die vanzelf voor.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {geleerd.map((p) => {
                      const uit = genegeerd.includes(p.key);
                      return (
                        <div key={p.key} className="chore-card" style={{ opacity: uit ? 0.45 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="type-dot" style={{ background: TYPES[p.type].color }} />
                                {p.titel}
                              </div>
                              <div className="chore-meta" style={{ marginTop: 6 }}>
                                {p.zekerheid >= 0.6
                                  ? `meestal ${FULL[p.dag]} rond ${hhmm(p.start)}`
                                  : `ongeveer elke ${p.ritme} dagen rond ${hhmm(p.start)}`}
                                {" · "}{p.keer} keer{p.dur ? ` · ${Math.round(p.dur * 60)} min` : ""}
                                {" · laatst "}{between(p.laatst, todayIso)} dagen geleden
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                              <span className="zeker" title="hoe vast dit patroon is">{Math.round(p.zekerheid * 100)}%</span>
                              <button className="btn btn-sm" onClick={() => setData((d) => ({
                                ...d,
                                genegeerd: uit ? genegeerd.filter((k) => k !== p.key) : [...genegeerd, p.key],
                              }))}>
                                {uit ? "Weer meenemen" : "Negeer"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {view === "profiel" && (
            <div style={{ marginTop: 24 }}>
              <ProfielForm profile={profile} user={user}
                onChange={(p) => setData((d) => ({ ...d, profile: p }))}
                onEmail={wijzigEmail} onWachtwoord={wijzigWachtwoord} />
            </div>
          )}

          {view === "hulp" && (
            <div style={{ marginTop: 24 }}>
              <Card icon={LifeBuoy} title="Zo werkt het" action={<span />}>
                {[
                  ["Zet je verplichtingen erin", "Werk, afspraken, alles waar je niet onderuit kunt, met het label Verplicht. Er wordt alleen gerekend met de ruimte die daarna overblijft."],
                  ["Vrije tijd is iets anders dan een gat", "Sport, uitgaan, mensen zien: label die als Vrije tijd. Zo kan het dashboard er iets over zeggen, bijvoorbeeld dat de gym op een dag van twaalf werkuren geen goed idee is."],
                  ["Klussen krijgen een ritme, geen datum", "Bij Huishouden geef je aan hoe vaak iets moet gebeuren en hoe lang het duurt. Loopt het achter, dan wordt er zelf een dag met ruimte gezocht."],
                  ["De opvangbak is voor alles zonder moment", "Gooi erin wat in je hoofd zit. Blijft het liggen, dan krijg je vanzelf een voorstel voor een dag en een tijd."],
                  ["Sneltoetsen", "⌘K opent zoeken en springt naar elk scherm, elke afspraak of klus. ⌘. opent snel toevoegen. Esc sluit alles."],
                  ["Stelt het dashboard iets onhandigs voor?", "Pas de drempels aan bij Instellingen: je wakkere uren, vanaf wanneer een dag vol is en hoeveel vrije uren je per week minimaal wilt."],
                ].map(([t, b], i) => (
                  <div key={i} className="help-step">
                    <span className="help-num">{i + 1}</span>
                    <div>
                      <div className="help-title">{t}</div>
                      <p className="help-text">{b}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {view === "koppelingen" && (
            <div style={{ marginTop: 24 }}>
              <Card icon={Plug} title="Koppelingen" action={<span />}>
                <div className="empty">
                  <div className="empty-title">Nog leeg</div>
                  <p className="empty-sub">Koppel later je agenda, zodat werktijden vanzelf binnenkomen.</p>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {paletteOpen && (
        <div className="modal-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <input className="palette-input" autoFocus placeholder="Zoek een scherm, afspraak of klus…"
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (paletteEvents[0]) { setSelected(paletteEvents[0]); setPaletteOpen(false); }
                  else if (paletteViews[0]) openView(paletteViews[0].id);
                }
              }} />
            <div className="palette-list">
              {paletteViews.length > 0 && <div className="palette-group">Schermen</div>}
              {paletteViews.map((n) => (
                <button key={n.id} className="palette-item" onClick={() => openView(n.id)}>
                  <n.icon size={15} strokeWidth={1.7} /> {n.label}
                </button>
              ))}
              {paletteEvents.length > 0 && <div className="palette-group">In je agenda</div>}
              {paletteEvents.map((e) => (
                <button key={e.id} className="palette-item" onClick={() => { setSelected(e); setPaletteOpen(false); }}>
                  <span className="type-dot" style={{ background: TYPES[e.type].color }} />
                  {e.title}<span className="meta">{cap(dayName(e.date))} {hhmm(e.start)}</span>
                </button>
              ))}
              {paletteChores.length > 0 && <div className="palette-group">Klussen</div>}
              {paletteChores.map((c) => (
                <button key={c.id} className="palette-item" onClick={() => openView("klussen")}>
                  <Check size={14} /> {c.name}<span className="meta">elke {c.every} dagen</span>
                </button>
              ))}
              {paletteViews.length + paletteEvents.length + paletteChores.length === 0 && (
                <div className="palette-group">Niets gevonden voor “{query}”</div>
              )}
            </div>
            <div className="palette-foot">
              <span><kbd><CornerDownLeft size={9} /></kbd>openen</span>
              <span><kbd>esc</kbd>sluiten</span>
            </div>
          </div>
        </div>
      )}

      {quickOpen && (
        <div className="modal-backdrop" onClick={() => setQuickOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Snel toevoegen</h3>
              <button className="icon-dim" onClick={() => setQuickOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ marginTop: 16 }}>
              <EventForm value={draft} onChange={setDraft} onZoek={() => zoekMoment(draft, setDraft)} />
              {patroonVoor(draft.title) && (
                <div className="patroon-hint">
                  <Repeat size={13} />
                  <span>
                    Je doet dit meestal op {FULL[patroonVoor(draft.title).dag]} rond {hhmm(patroonVoor(draft.title).start)}.
                  </span>
                  <button className="btn btn-sm" onClick={() => neemPatroonOver(patroonVoor(draft.title), draft, setDraft)}>
                    Overnemen
                  </button>
                </div>
              )}
              <button className="btn-primary" style={{ justifyContent: "center", width: "100%", marginTop: 12 }}
                onClick={() => addEvent(true)}>
                Zet op {dayName(draft.date)} {parse(draft.date).getDate()}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && !edit && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11.5, color: TYPES[selected.type].color }}>{TYPES[selected.type].label}</div>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 500 }}>{selected.title}</h3>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {cap(dayName(selected.date))} {parse(selected.date).getDate()} {parse(selected.date).toLocaleDateString("nl-NL", { month: "long" })} · {hhmm(selected.start)} – {hhmm(selected.end)}
                </div>
              </div>
              <button className="icon-dim" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setEdit({
                id: selected.id, title: selected.title, type: selected.type,
                date: selected.date, start: hhmm(selected.start), end: hhmm(selected.end),
              })}>Bewerken</button>
              <button className="btn" onClick={() => {
                setData((p) => ({ ...p, events: p.events.map((e) => e.id === selected.id ? { ...e, date: iso(addDays(parse(e.date), 1)) } : e) }));
                setSelected(null); flash("Dag opgeschoven");
              }}>Dag later</button>
              <button className="btn danger" onClick={() => {
                setData((p) => ({ ...p, events: p.events.filter((e) => e.id !== selected.id) }));
                setSelected(null); flash("Verwijderd");
              }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Afspraak bewerken</h3>
              <button className="icon-dim" onClick={() => setEdit(null)}><X size={16} /></button>
            </div>
            <div style={{ marginTop: 16 }}>
              <EventForm value={edit} onChange={setEdit} onZoek={() => zoekMoment(edit, setEdit)} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={saveEdit}>Opslaan</button>
                <button className="btn" onClick={() => setEdit(null)}>Annuleren</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
