# Backlog

Dette er prosjektets enkle kanban-backlog. Bruk den til å samle arbeid, prioritere neste steg og holde fokus på få aktive oppgaver om gangen.

## Prioritetsregler

- `P0`: Kritisk. Datatap, feil som blokkerer bruk, eller noe som kan ødelegge tillit til systemet. Skal inn i `Nå`.
- `P1`: Viktig. Bør tas snart fordi det reduserer risiko eller forbedrer kjerneflyten merkbart.
- `P2`: Nyttig. Forbedrer kvalitet, brukeropplevelse eller vedlikehold, men kan vente.
- `P3`: Lav prioritet. Ideer, polish eller opprydding uten tydelig hast.

## Arbeidsflyt

- Ha maks 3 oppgaver i `Nå`.
- Flytt én oppgave fra `Neste` til `Nå` når kapasitet frigjøres.
- Skriv alltid et konkret neste steg.
- Flytt fullførte oppgaver til `Ferdig` med dato og kort resultat.
- Bruk `Parkert` for ting som ikke skal prioriteres nå, men heller ikke glemmes.

## Oppgaveformat

```md
### Tittel
- Type: bug | feature | tech debt | ux | data safety
- Prioritet: P0 | P1 | P2 | P3
- Hvorfor: Kort forklaring på verdi/risiko.
- Neste steg: Én konkret handling.
- Område: Relevante filer eller deler av appen.
```

## Nå

### Gjør forsiden til en arbeidsflate for månedlig rutine
- Type: ux
- Prioritet: P1
- Hvorfor: Bruksmønsteret starter alltid med import, kategorisering og månedens status. Forsiden bør hjelpe med neste handling, ikke vise en kontobalanse-graf som ikke brukes.
- Neste steg: Skisser og bygg en hybrid forside med importstatus, ukategoriserte transaksjoner og "Måneden så langt".
- Område: `components/HomePage.tsx`, `components/TransactionPage.tsx`, `components/BudgetPage.tsx`

### Verifiser backup- og restore-flyten etter datagjenoppretting
- Type: data safety
- Prioritet: P0
- Hvorfor: Prosjektet må ha høy tillit til at historikk kan reddes uten å overskrive nyere import.
- Neste steg: Test `Flett inn` med en eldre backup og bekreft at transaksjonsantall og datospenn bevares etter reload.
- Område: `components/BackupPage.tsx`, `services/autoBackup.ts`, `src/store/index.ts`

### Sikre at transaksjoner alltid persisteres
- Type: data safety
- Prioritet: P0
- Hvorfor: En tidligere feil gjorde at `transaction-store` manglet `transactions`, som førte til tom historikk etter reload.
- Neste steg: Legg inn en enkel test eller manuell sjekkliste for import -> reload -> fortsatt samme antall transaksjoner.
- Område: `src/store/index.ts`, `services/browserPersistence.ts`

## Neste

### Bytt Type-filter til pills
- Type: ux
- Prioritet: P2
- Hvorfor: `Type` har få kjente valg og bør kunne endres med ett klikk i stedet for dropdown.
- Neste steg: Erstatt Type-dropdown i toolbar med pills/segmenter som `Alle`, `Utgifter`, `Inntekter` og relevante interne typer.
- Område: `components/TransactionPage.tsx`, filter-toolbar

### Gjør budsjettsetting enklere med historikkforslag
- Type: feature
- Prioritet: P2
- Hvorfor: Budsjett er nyttig først når det er lett å sette realistiske tall. Manuell setting oppleves klønete.
- Neste steg: Foreslå budsjettbeløp basert på snitt siste 3/6/12 måneder per kategori.
- Område: `components/BudgetPage.tsx`, budsjettberegninger

### Lag data health check i appen
- Type: feature
- Prioritet: P1
- Hvorfor: Det bør være lett å se datospenn, antall transaksjoner, backup-status og om data ser ufullstendig ut.
- Neste steg: Skisser en liten statusboks på Backup-siden med antall, tidligste/seneste måned og siste backup.
- Område: `components/BackupPage.tsx`, `services/autoBackup.ts`

### Gjør import-resultatet tryggere og tydeligere
- Type: ux
- Prioritet: P1
- Hvorfor: Brukeren må se om importen la til data, hoppet over duplikater eller fjernet legacy-rester.
- Neste steg: Forbedre importoppsummeringen med datospenn før/etter og antall per måned.
- Område: `components/TransactionPage.tsx`

### Rydd opp i release-artifacts
- Type: tech debt
- Prioritet: P2
- Hvorfor: `release/` inneholder store genererte filer som ikke trengs i daglig utvikling og kan forvirre.
- Neste steg: Bestem om `release/` skal ignoreres, slettes lokalt eller dokumenteres som build-output.
- Område: `release/`, `.gitignore`

### Konsolider persistence-ansvar
- Type: tech debt
- Prioritet: P1
- Hvorfor: Prosjektet har hatt flere lagringsnøkler og tjenester (`transaction-store`, legacy `transaction-app-data`, backup), som øker risiko.
- Neste steg: Dokumenter én kilde til sannhet og hvilke recovery-mekanismer som finnes.
- Område: `src/store/index.ts`, `services/browserPersistence.ts`, `services/autoBackup.ts`

## Senere

### Gjør webappen bedre på mobil
- Type: ux
- Prioritet: P2
- Hvorfor: Mobil er ønsket for enklere innsyn og synk på sikt, men desktop-flyten må først bli trygg og god.
- Neste steg: Gjør en enkel mobil-audit av forsiden, transaksjonslisten, backup og budsjett før egen app vurderes.
- Område: Responsiv UI

### Dobbeltklikkbar desktop-app uten Cursor
- Type: feature
- Prioritet: P2
- Hvorfor: Appen bør kunne startes som en vanlig app uten å spinne opp Cursor/dev-server hver gang.
- Neste steg: Når webflyten er stabil, vurder enkleste pakkeløp for lokal app og dokumenter hvor appdata/backup lagres.
- Område: Build/distribusjon

### Egen Backlog-side i appen
- Type: feature
- Prioritet: P3
- Hvorfor: Kan bli nyttig hvis prosjektstyring skal skje inne i appen i stedet for markdown.
- Neste steg: Vurder først om `BACKLOG.md` er nok etter noen ukers bruk.
- Område: `demo/App.tsx`, `components/Sidebar.tsx`

### Dokumenter importformat og backupformat
- Type: documentation
- Prioritet: P2
- Hvorfor: Det bør være tydelig hvilke Excel/CSV/JSON-formater appen støtter.
- Neste steg: Lag en kort `docs/import-and-backup.md`.
- Område: `excelParser.ts`, `csvParser.ts`, `services/autoBackup.ts`

### Rydd opp i browser-build warnings
- Type: tech debt
- Prioritet: P2
- Hvorfor: Builden passerer, men advarer om stor bundle og at `csvParser.ts` importerer Node-filsystemkode (`fs/promises`) som ikke hører hjemme i browser-bundlen.
- Neste steg: Skill ren CSV-parsing fra fil-lesing og vurder code splitting for tunge biblioteker som `xlsx` og grafer.
- Område: `csvParser.ts`, `vite.config.ts`, import/parsing, bundle

### Gjør kontobalanse-grafen mer forklarbar
- Type: ux
- Prioritet: P2
- Hvorfor: Brukeren bør forstå hvilken startbalanse og hvilke transaksjoner som påvirker grafen.
- Neste steg: Legg til tooltip eller statuslinje med datagrunnlag og startbalanse.
- Område: `components/HomePage.tsx`, `components/BudgetPage.tsx`

## Parkert

### Flytt backlog til GitHub Issues eller Projects
- Type: process
- Prioritet: P3
- Hvorfor: Kan være nyttig hvis prosjektet får flere bidragsytere eller behov for ekstern sporing.
- Neste steg: Ta stilling senere hvis markdown-backlog blir for enkel.
- Område: Prosess

### Egen mobilapp med enklere synk
- Type: feature
- Prioritet: P3
- Hvorfor: En mobilapp kan gjøre innsyn og synk enklere, men er større enn dagens viktigste desktop-forbedringer.
- Neste steg: Parker til datalagring, backup og webflyt er stabile.
- Område: Mobil, synk, dataarkitektur

## Ferdig

### Kategori-autocomplete overalt
- Type: ux
- Prioritet: P1
- Ferdig: 2026-04-30
- Resultat: Kategorivelgere på transaksjonsfilter, bulk-kategorisering, transaksjonsrader og regelredigering bruker nå søkbar autocomplete.

### Hurtig-unntak direkte fra kategorivelger
- Type: ux
- Prioritet: P1
- Ferdig: 2026-04-30
- Resultat: Høyreklikk på kategori i transaksjonsradens autocomplete låser kategorien som `Bare denne transaksjonen` uten bulk-toolbar.

### Datofilter med raske periodevalg
- Type: ux
- Prioritet: P1
- Ferdig: 2026-04-30
- Resultat: Transaksjonssiden har raske periodevalg for denne måneden, forrige måned, siste 3 mnd, siste 12 mnd og i år.

### Oversikt 12 mnd-rekkefølge og kolonner
- Type: ux
- Prioritet: P1
- Ferdig: 2026-04-30
- Resultat: Rekkefølgen er nå utgifter, sparing, inntekter og balanse. Variasjon vises rett etter radnavn, og månedene vises med siste måned først.

### Automatisk backup til valgt mappe
- Type: data safety
- Prioritet: P0
- Ferdig: 2026-04-30
- Resultat: Backup-siden kan velge backupmappe der nettleseren støtter File System Access API, viser siste fil/status og faller tilbake til vanlig nedlasting ellers.

### Opprett markdown-backlog
- Type: process
- Prioritet: P1
- Ferdig: 2026-04-30
- Resultat: `BACKLOG.md` opprettet med kanban-struktur, prioriteringsregler og første oppgaver.
