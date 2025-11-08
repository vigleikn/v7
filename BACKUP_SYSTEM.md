# Backup & Restore System

**Implementert:** 2025-11-06  
**Status:** ✅ Fullført og testet

---

## 📊 Oversikt

Komplett backup/restore system som sikrer brukerdata mot tap. Systemet inkluderer automatisk daglig backup og manuell import/export funksjonalitet.

---

## 🎯 Funksjoner

### 1. **Automatisk daglig backup** 

#### Hvordan det fungerer:
- Ved første app-lasting hver dag (hvis data finnes)
- Sjekker `localStorage.getItem('last-backup-date')`
- Hvis dato ≠ i dag → trigger automatisk nedlasting
- Oppdaterer `last-backup-date` etter vellykket backup

#### Backup innhold:
```json
{
  "version": "1.0.0",
  "backupDate": "2025-11-06T10:30:00.000Z",
  "data": {
    "transactions": [...],
    "hovedkategorier": [...],
    "underkategorier": [...],
    "rules": [...],
    "locks": [...],
    "budgets": [...],
    "startBalance": {
      "amount": 100000,
      "date": "2025-11-01"
    }
  },
  "metadata": {
    "transactionCount": 1234,
    "categoryCount": 25,
    "ruleCount": 15
  }
}
```

#### Filnavn:
```
transaction-backup-YYYY-MM-DD.json
```
Eksempel: `transaction-backup-2025-11-06.json`

---

### 2. **Manuell eksport**

- Klikk "Last ned backup nå" på Backup-siden
- Laster ned JSON-fil til nedlastingsmappen
- Samme format som automatisk backup
- Kan gjøres når som helst

---

### 3. **Import/Gjenoppretting**

#### Metoder:
1. **Drag & Drop** - Dra JSON-fil inn i drop-området
2. **Fil-velger** - Klikk "Velg fil" og naviger til backup

#### Flyt:
1. Velg `.json` backup-fil
2. Fil valideres automatisk
3. Forhåndsvisning vises:
   - Backup-dato
   - Antall transaksjoner
   - Antall kategorier
   - Antall regler
4. Bekreft: "Ja, gjenopprett" eller "Avbryt"
5. Ved bekreftelse:
   - Store rehydreres med backup-data
   - localStorage oppdateres automatisk
   - Melding vises: "Data gjenopprettet!"

---

## 🏗️ Arkitektur

### Filer

#### `services/autoBackup.ts`
Core backup service med:
- `setupAutoBackup()` - Auto-backup ved app load
- `shouldBackupToday()` - Sjekk om backup trengs
- `createBackupData()` - Generer backup fra store
- `downloadBackup()` - Trigger nedlasting i browser
- `validateBackupData()` - Valider backup-struktur
- `restoreFromBackup()` - Gjenopprett fra backup
- `parseBackupFile()` - Parse og valider JSON-fil

#### `components/BackupPage.tsx`
UI komponent med:
- Backup status oversikt
- Nåværende data statistikk
- Manual export knapp
- Drag & Drop import område
- Bekreftelsesdialog med forhåndsvisning
- Success/error meldinger

---

## 🔧 Teknisk implementasjon

### Auto-backup på app load

```typescript
// demo/App.tsx
useEffect(() => {
  setupBrowserPersistence(); // Load data
  setupAutoBackup();         // Check & trigger backup
}, []);
```

### Export (download)

```typescript
const backupData = createBackupData();
const jsonString = JSON.stringify(backupData, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);

const link = document.createElement('a');
link.href = url;
link.download = `transaction-backup-${date}.json`;
link.click();
```

### Import (restore)

```typescript
// 1. Parse fil
const text = await file.text();
const data = JSON.parse(text);

// 2. Valider
const validation = validateBackupData(data);
if (!validation.valid) throw new Error(...);

// 3. Restore store
useTransactionStore.setState({
  transactions: data.data.transactions,
  hovedkategorier: new Map(data.data.hovedkategorier),
  // ... etc
});

// 4. Refresh
state.refreshStats();
state.setFilters(state.filters);
```

---

## 📝 Validering

Backup-filer valideres før import:

```typescript
✅ Sjekker:
- version field eksisterer
- data objekt er gyldig
- transactions er array
- hovedkategorier er array
- underkategorier er array
- rules er array
- locks er array
- metadata er gyldig objekt

❌ Avviser:
- Manglende felter
- Feil datatyper
- Korrupt JSON
- Ugyldig struktur
```

---

## 🎨 UI/UX Detaljer

### Backup-siden (`I` i sidebar)

#### Status-kort:
- ✅ "Backup utført i dag" (grønn) hvis done
- ⚠️ "Backup påkrevd" (orange) hvis pending
- Viser siste backup-dato

#### Data-statistikk:
4 kort med:
- 📊 Transaksjoner
- 📁 Kategorier  
- 📋 Regler
- ✅ Kategoriserte

#### Eksport-seksjon:
- "Last ned backup nå" knapp
- Liste over backup-innhold

#### Import-seksjon:
- Drag & Drop område (visuell feedback)
- Fil-velger knapp
- Advarsel om at data vil erstattes

#### Bekreftelsesdialog:
- Forhåndsvisning av backup
- "Avbryt" / "Ja, gjenopprett"
- Rød advarsel-tekst

#### Meldinger:
- ✅ Grønn success (med ikon)
- ❌ Rød error (med ikon)
- ℹ️ Blå info (med ikon)

---

## 🧪 Testing

### Manual testing flow:

1. **Test auto-backup:**
   ```
   - Åpne appen første gang i dag
   - Sjekk nedlastingsmappen
   - Verifiser fil: transaction-backup-YYYY-MM-DD.json
   - Åpne fil og inspisér innhold
   ```

2. **Test manual export:**
   ```
   - Gå til Backup-siden (I)
   - Klikk "Last ned backup nå"
   - Verifiser nedlastet fil
   ```

3. **Test drag & drop import:**
   ```
   - Dra backup-fil til drop-området
   - Verifiser forhåndsvisning
   - Klikk "Ja, gjenopprett"
   - Verifiser at data er gjenopprettet
   ```

4. **Test fil-velger import:**
   ```
   - Klikk "Velg fil"
   - Velg backup-fil
   - Samme flyt som drag & drop
   ```

5. **Test validering:**
   ```
   - Forsøk å importere ugyldig JSON
   - Forsøk å importere .txt fil
   - Forsøk å importere backup med manglende felter
   - Verifiser error-meldinger
   ```

---

## 📦 Dependencies

### Nye dependencies:
- Ingen! Alt er pure JavaScript/TypeScript

### Bruker eksisterende:
- React hooks (useState, useRef, useEffect)
- Zustand store
- shadcn/ui komponenter
- lucide-react ikoner

---

## 🔐 Sikkerhet

### Data-integritet:
- ✅ Validering av alle backup-filer
- ✅ Type-checking på import
- ✅ Bekreftelse før overskrivning
- ✅ Feilhåndtering med try/catch

### localStorage:
- ✅ Automatisk sync via Zustand persist
- ✅ Backup før overskrivning (i nedlastinger)
- ✅ Ingen sensitive data eksponert

---

## 🚀 Bruk

### For brukere:

1. **Automatisk (anbefalt):**
   - Backups lastes ned automatisk hver dag
   - Finn filer i nedlastingsmappen
   - Lagre på sikker plass (cloud/ekstern disk)

2. **Manuell backup:**
   - Gå til "I" i sidebar
   - Klikk "Last ned backup nå"
   - Lagre filen

3. **Gjenopprette:**
   - Gå til "I" i sidebar
   - Dra backup-fil eller klikk "Velg fil"
   - Bekreft import
   - Ferdig!

---

## 💡 Tips

### Best practices:
- 📅 La automatisk backup gjøre jobben
- 💾 Lagre backups i cloud (Dropbox, OneDrive, iCloud)
- 🔄 Ta manual backup før store endringer
- 📁 Organiser backups i mapper per måned/år
- ✅ Test backup-restore periodisk

### Troubleshooting:
- **Backup lastes ikke ned:** Sjekk browser-innstillinger for nedlastinger
- **Import feiler:** Verifiser at filen er en gyldig JSON backup
- **Gammel data:** Sjekk backup-dato i forhåndsvisningen

---

## 📋 Fremtidige forbedringer

Mulige utvidelser:
- 🔮 Cloud sync (Google Drive, Dropbox API)
- 🔮 Automatisk ukentlig/månedlig backup
- 🔮 Backup-historikk med multiple versjoner
- 🔮 Partial restore (bare kategorier, bare transaksjoner, etc.)
- 🔮 Merge imports (kombinere i stedet for erstatte)
- 🔮 Export til CSV/Excel format

---

## ✅ Ferdigstilt

Backup-systemet er fullstendig implementert og testet:

1. ✅ Automatisk daglig backup
2. ✅ Manuell eksport
3. ✅ Import med drag & drop
4. ✅ Fil-validering
5. ✅ Forhåndsvisning
6. ✅ Bekreftelsesdialog
7. ✅ Error handling
8. ✅ UI med feedback

**Klar til bruk!** 🎉

