# CSV Import Guide

Complete guide for importing transactions via the web interface.

## Overview

The Transaction page now includes a **"Importer CSV"** button that allows you to upload Norwegian bank transaction CSV files directly from the browser.

## Features

✅ **Browser-based import** - No server needed, files processed in browser  
✅ **Duplicate detection** - Removes duplicates from CSV and against existing data  
✅ **Auto-categorization** - Applies existing rules to new transactions  
✅ **Auto-save** - Imported data automatically persisted to localStorage  
✅ **Progress feedback** - Loading state and success/error messages  
✅ **Safe import** - Validates CSV format before importing  

## How to Use

### Step 1: Open Transaction Page

1. Navigate to **http://localhost:3000** (or your app URL)
2. You should see the transaction table
3. Look for **"📄 Importer CSV"** button in the top-right corner

### Step 2: Click Import Button

1. Click **"📄 Importer CSV"**
2. File selection dialog opens
3. Select your CSV file (must have `.csv` extension)

### Step 3: Wait for Processing

The button shows:
```
⏳ Importerer...
```

While processing:
1. Reads CSV file
2. Parses transactions
3. Removes duplicates in CSV
4. Checks for duplicates with existing data
5. Auto-categorizes with existing rules
6. Saves to localStorage

### Step 4: Review Results

Success message appears:
```
✅ Importert 25 nye transaksjoner • 12 auto-kategorisert • 3 duplikater fjernet
```

## CSV Format Required

The CSV must have these columns (semicolon-separated):

### Required Columns
- `Dato` - Date (YYYY-MM-DD)
- `Beløp` - Amount (Norwegian format: -1.234,56)
- `Til konto` - To account
- `Til kontonummer` - To account number
- `Fra konto` - From account
- `Fra kontonummer` - From account number
- `Type` - Transaction type
- `Tekst` - Description
- `Underkategori` - Subcategory (display only)

### Example CSV

```csv
Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-10-01;-235,00;-235,00;NOK;;;Felles;3610.61.63558;Betaling;KIWI;;Mat;Dagligvarer
2025-10-02;-189,00;-189,00;NOK;;;Felles;3610.61.63558;Betaling;REMA 1000;;Mat;Dagligvarer
```

## What Happens During Import

### 1. CSV Parsing

```typescript
parseCSV(fileContent)
→ Parses Norwegian format (semicolon, comma decimals)
→ Removes duplicates within CSV
→ Returns: { transactions, duplicates, originalCount, uniqueCount }
```

### 2. Duplicate Detection

```typescript
// Check against existing transactions
existingIds = Set(existing transaction IDs)
uniqueNew = filter out any with matching IDs
→ Only truly new transactions added
```

### 3. Auto-Categorization

```typescript
// Apply existing rules
applyRulesToAll()
→ If rule exists for transaction text, auto-categorize
→ Example: "KIWI" rule exists → new KIWI transactions auto-categorized
```

### 4. Persistence

```typescript
saveToBrowser()
→ Saves all transactions to localStorage
→ Includes categories, rules, and locks
```

## Import Statistics

The success message shows:
- **Nye transaksjoner**: How many were actually imported
- **Auto-kategorisert**: How many got categories from rules
- **Duplikater fjernet**: Total removed (from CSV + existing)

## Error Handling

### Invalid CSV Format

```
❌ Feil ved import: Missing required columns: Dato, Beløp
```

### Empty File

```
❌ Feil ved import: CSV file is empty
```

### All Duplicates

```
ℹ️ Ingen nye transaksjoner å importere (alle er duplikater)
```

## Example Workflow

### First Import

1. Click **"Importer CSV"**
2. Select `october_transactions.csv` (100 transactions)
3. Wait for import...
4. Result: `✅ Importert 100 nye transaksjoner • 0 auto-kategorisert • 5 duplikater fjernet`
5. No auto-categorization yet (no rules exist)

### Create Rules

1. Categorize some transactions manually
2. Create rules (check "create rule" when categorizing)
3. Rules are saved automatically

### Second Import (Next Month)

1. Click **"Importer CSV"**
2. Select `november_transactions.csv` (120 transactions)
3. Wait for import...
4. Result: `✅ Importert 120 nye transaksjoner • 85 auto-kategorisert • 3 duplikater fjernet`
5. **85 transactions auto-categorized!** (using rules from first import)

## Best Practices

### 1. Create Rules Before Importing

If you regularly shop at the same places:
1. Manually categorize a few transactions
2. Create rules for common merchants
3. Future imports will be mostly auto-categorized

### 2. Import Regularly

- Import monthly statements
- Duplicate detection prevents duplicates
- Rules make each import faster

### 3. Review After Import

1. Filter by "Ukategorisert" to see what wasn't auto-categorized
2. Create rules for new patterns
3. Future imports will categorize them

### 4. Backup Before Large Imports

Though not required (duplicates are handled), you can:
1. Export current data first
2. Import new CSV
3. If something goes wrong, re-import your backup

## Technical Details

### Duplicate Detection Algorithm

```typescript
// Generate unique ID for each transaction
transactionId = `${dato}|${beløp}|${type}|${tekst}|${fraKonto}|${tilKonto}`

// Duplicates have same ID
isDuplicate = existingIds.has(transactionId)
```

### Auto-Categorization

```typescript
// For each imported transaction:
1. Check if rule exists for normalized text
2. If rule exists, apply category
3. If transaction is locked, use locked category (highest priority)
4. If no rule and not locked, leave uncategorized
```

### Performance

- Imports up to 1000 transactions in < 1 second
- CSV parsing is synchronous but fast
- Duplicate checking is O(n) with Set lookup
- Rule application is O(n × m) where m = number of rules

## Browser Compatibility

Works in all modern browsers:
- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅

Requires:
- FileReader API (supported in all modern browsers)
- localStorage (for auto-save)

## Testing

### Test CSV File

Use the sample file: `data/23421.csv`

```bash
# From the app:
1. Click "Importer CSV"
2. Select data/23421.csv
3. Should import ~130 transactions
```

### Create Test File

```csv
Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-11-01;-100,00;-100,00;NOK;;;Test;123;Betaling;TEST MERCHANT;;;
```

## Troubleshooting

### Import button doesn't work

- Check browser console for errors (F12)
- Make sure file has `.csv` extension
- Try with sample file `data/23421.csv`

### No auto-categorization

- No rules exist yet
- Create rules first by manually categorizing
- Check "create rule" when categorizing

### Duplicates not detected

- Ensure transactions have exact same values
- Check that date, amount, type, text, and accounts match
- Transaction IDs are case-sensitive for text

## Advanced Usage

### Import from Different Sources

If your bank CSV has different column names:
1. Update `csvParser.ts` to map columns
2. Or pre-process CSV to match expected format

### Batch Import

Import multiple months:
1. Import month 1
2. Create rules
3. Import month 2 → auto-categorizes
4. Import month 3 → auto-categorizes
5. Etc.

### Export and Share

After importing and categorizing:
1. Open browser console (F12)
2. Run: `localStorage.getItem('transaction-app-data')`
3. Copy JSON
4. Share with another user
5. They can import via console: `localStorage.setItem('transaction-app-data', '...')`

## License

MIT

