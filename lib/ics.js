/** Zet je afspraken om in een .ics-bestand dat Apple Agenda, Google Agenda en Outlook begrijpen. */

const LABELS = { verplicht: "Verplicht", vrij: "Vrije tijd", klus: "Huishouden" };
const pad = (n) => String(n).padStart(2, "0");

/** "2026-07-18" + 9.5 → "20260718T093000" */
function stempel(datum, uren) {
  const [y, m, d] = datum.split("-");
  const h = Math.floor(uren);
  const min = Math.round((uren % 1) * 60);
  return `${y}${m}${d}T${pad(h)}${pad(min)}00`;
}

function ontsnap(tekst = "") {
  return String(tekst)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(events = [], naam = "Dashboard") {
  const nu = new Date();
  const stamp = `${nu.getUTCFullYear()}${pad(nu.getUTCMonth() + 1)}${pad(nu.getUTCDate())}T${pad(nu.getUTCHours())}${pad(nu.getUTCMinutes())}${pad(nu.getUTCSeconds())}Z`;

  const regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dashboard//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${ontsnap(naam)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
  ];

  for (const e of events) {
    if (!e?.date || e.start == null || e.end == null) continue;
    regels.push(
      "BEGIN:VEVENT",
      `UID:${e.id || Math.random().toString(36).slice(2)}@dashboard`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Amsterdam:${stempel(e.date, e.start)}`,
      `DTEND;TZID=Europe/Amsterdam:${stempel(e.date, e.end)}`,
      `SUMMARY:${ontsnap(e.title)}`,
      `CATEGORIES:${ontsnap(LABELS[e.type] || "Overig")}`,
      `DESCRIPTION:${ontsnap(LABELS[e.type] || "")} · via je dashboard`,
      "END:VEVENT"
    );
  }

  regels.push("END:VCALENDAR");
  return regels.join("\r\n");
}
