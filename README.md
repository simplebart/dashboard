# Dashboard

Een persoonlijk dashboard dat je week plant en zelf voorstellen doet. Het onderscheid tussen
**verplicht** (werk, afspraken), **vrije tijd** (sport, uitgaan) en **huishouden** is de basis
waar alle logica op draait.

## Wat het doet

- **Weekplanner** met drie soorten tijd, elk met een eigen kleur.
- **Voorstellen**: het dashboard kijkt zelf naar je week en zegt bijvoorbeeld
  *"Je werkt woensdag 12 uur — gym liever zaterdag om 10:00?"* of
  *"Stofzuigen was 5 dagen geleden, donderdag heb je ruimte."* Eén klik en het staat erin.
- **Huishouden** met intervallen: elke klus heeft een ritme (elke X dagen) en een duur.
- **Piekuren en ritme**: waar je uren zich ophopen en hoe verplicht en vrij zich verhouden.
- Alles wordt lokaal bewaard in je browser (`localStorage`), tot je een database koppelt.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Op GitHub zetten

```bash
git init
git add .
git commit -m "Eerste versie van het tweede brein"
git branch -M main
git remote add origin https://github.com/JOUW-NAAM/dashboard.git
git push -u origin main
```

## Naar Vercel

1. Ga naar vercel.com en kies **Add New → Project**.
2. Kies je GitHub-repo `dashboard`.
3. Vercel herkent Next.js zelf. Klik **Deploy** — je hoeft niets in te stellen.
4. Elke `git push` naar `main` zet vanzelf een nieuwe versie live.


## Inloggen en database (Supabase)

1. Maak een project aan op supabase.com.
2. Open de SQL Editor en voer `supabase.sql` uit. Dat maakt de tabel `dashboards`
   en zet row level security aan, zodat niemand bij de week van een ander kan.
3. Ga naar Project Settings → API en kopieer de Project URL en de anon key.
4. Maak lokaal een bestand `.env.local` met die twee waarden (zie `.env.example`).
5. Zet dezelfde twee waarden in Vercel onder Settings → Environment Variables.

Staan de sleutels er niet, dan draait alles in lokale modus: geen login nodig en
je gegevens blijven in de browser. Handig om te ontwikkelen.

Inloggen gaat met e-mail en wachtwoord op `/login`. Wil je geen bevestigingsmail,
zet dan in Supabase onder Authentication → Providers → Email de optie
"Confirm email" uit.

## Later: losse tabellen

De code is er al op voorbereid. In `app/page.jsx` staan twee functies, `loadData` en `saveData`.
Die zijn nu de enige plek die weet waar je gegevens vandaan komen. Wil je naar een echte
database, dan vervang je alleen die twee.

**Voorstel voor de volgende stap** (werkt gratis en past bij Vercel):

- **Supabase** voor database én inloggen. Twee tabellen: `events` (id, user_id, date, start,
  end, title, type) en `chores` (id, user_id, name, every, last, dur). Zet in beide een
  row level security-regel op `user_id = auth.uid()`, zodat iedereen alleen zijn eigen week ziet.
- **Auth.js (NextAuth)** als je liever met Google of GitHub inlogt.

Wat je dan verandert:

```js
// in plaats van localStorage
async function loadData() {
  const { data: events } = await supabase.from("events").select("*");
  const { data: chores } = await supabase.from("chores").select("*");
  return { events, chores };
}
```

De rest van de app hoeft niet mee te veranderen.

## Structuur

```
app/
  globals.css   het hele donkere thema, alle kleuren staan bovenaan als variabelen
  layout.jsx    html-omhulsel
  page.jsx      de app: model, voorstel-logica, alle schermen
```

De voorstel-logica staat in `page.jsx` in de functie `suggest()`. Wil je een nieuw soort
voorstel toevoegen, dan schrijf je daar een regel bij die een object met `head`, `body`,
`cta` en `action` teruggeeft.


## Je agenda in Apple Agenda

Twee manieren, allebei te vinden onder Instellingen.

**Eenmalig overzetten.** Download een `.ics` met al je afspraken en open het bestand.
Apple Agenda voegt ze toe. Wat je daarna in het dashboard wijzigt, komt niet mee.

**Live meekijken.** Kopieer het `webcal://`-adres en ga in Apple Agenda naar
Archief → Nieuw agenda-abonnement. Plak het adres en kies hoe vaak het ververst.
Je week verschijnt dan als aparte agenda op je Mac, iPhone en horloge, en werkt zichzelf bij.

Hiervoor is één extra sleutel nodig: zet `SUPABASE_SERVICE_ROLE_KEY` in Vercel onder
Environment Variables (Project Settings → API → service_role). Die sleutel draait alleen
op de server en mag nooit in de browser terechtkomen — zet er dus geen `NEXT_PUBLIC_` voor.

Het adres bevat een lange willekeurige sleutel. Wie hem heeft, kan je agenda lezen,
dus deel hem niet. Vertrouw je het niet meer, klik dan op Vervang: het oude adres
werkt daarna niet meer.
