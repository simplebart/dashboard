/** Zet je afspraken om in een .ics-bestand dat Apple Agenda, Google Agenda en Outlook begrijpen. */

const LABELS = { verplicht: "Verplicht", vrij: "Vrije tijd", klus: "Huishouden" };
const pad = (n) => String(n).padStart(2, "0");

/**
 * Apple Agenda weigert een bestand dat naar een tijdzone verwijst zonder die
 * te beschrijven. Daarom staat de Nederlandse zomer- en wintertijd hier volledig in.
 */
const TIJDZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Amsterdam",
  "X-LIC-LOCATION:Europe/Amsterdam",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** "2026-07-18" + 9.5 → "20260718T093000", en 24.5 rolt netjes door naar de volgende dag */
function stempel(datum, uren) {
  const [y, m, d] = datum.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setMinutes(Math.round(uren * 60));
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function ontsnap(tekst = "") {
  return String(tekst)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** regels langer dan 75 tekens moeten worden gevouwen, anders keuren strenge lezers het af */
function vouw(regel) {
  if (regel.length <= 74) return [regel];
  const stukken = [regel.slice(0, 74)];
  let rest = regel.slice(74);
  while (rest.length > 73) {
    stukken.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest) stukken.push(" " + rest);
  return stukken;
}

export function buildIcs(events = [], naam = "Dashboard") {
  const nu = new Date();
  const stamp = `${nu.getUTCFullYear()}${pad(nu.getUTCMonth() + 1)}${pad(nu.getUTCDate())}T${pad(nu.getUTCHours())}${pad(nu.getUTCMinutes())}${pad(nu.getUTCSeconds())}Z`;

  const regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dashboard//NL//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${ontsnap(naam)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
    ...TIJDZONE,
  ];

  for (const e of events) {
    if (!e || typeof e.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const start = Number(e.start);
    let eind = Number(e.end);
    if (!Number.isFinite(start) || !Number.isFinite(eind)) continue;
    if (eind <= start) eind = start + 0.5;

    regels.push(
      "BEGIN:VEVENT",
      `UID:${String(e.id || Math.random().toString(36).slice(2))}@dashboard`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Amsterdam:${stempel(e.date, start)}`,
      `DTEND;TZID=Europe/Amsterdam:${stempel(e.date, eind)}`,
      `SUMMARY:${ontsnap(e.title || "Afspraak")}`,
      `CATEGORIES:${ontsnap(LABELS[e.type] || "Overig")}`,
      `DESCRIPTION:${ontsnap(LABELS[e.type] || "")} via je dashboard`,
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  regels.push("END:VCALENDAR");
  return regels.flatMap(vouw).join("\r\n") + "\r\n";
}
