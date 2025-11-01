# 🚀 Quick Start Guide

Complete guide to getting started with the Personal Finance Transaction Management System.

## 🎯 What You Have

A **complete personal finance tool** with:
- CSV import for Norwegian bank transactions
- Automatic categorization with smart rules
- Exception handling for special cases
- React UI with transaction table and category management
- Local persistence (auto-save)

## 🏃 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start the Demo

```bash
npm run dev
```

### Step 3: Open Your Browser

Go to: **http://localhost:3000**

## 🎨 What You'll See

### Transaction Page (Default)

A table with 10 sample transactions showing:
- Date, amount, type, description
- Account information
- Category dropdown for each transaction
- Filter controls (search, date range, type, category)

### Try This:

1. **Search for "KIWI"** → See all KIWI purchases
2. **Select all** (checkbox in header)
3. **Choose category** from bulk dropdown
4. **Click "Kategoriser"** → All KIWI transactions categorized!

### Category Page

Click **"Kategorier"** in the sidebar to see:
- Protected "Inntekter" category
- Add new categories with the "+ Ny hovedkategori" button
- Add subcategories with the + button in each card

## 📚 Learn by Doing

### Tutorial 1: Create Categories

1. Click **"Kategorier"** in sidebar
2. Click **"+ Ny hovedkategori"**
3. Type "Mat" → Press Enter
4. Click **+** in the "Mat" card
5. Type "Dagligvarer" → Press Enter
6. ✨ You now have Mat → Dagligvarer!

### Tutorial 2: Categorize Transactions

1. Click **"Transaksjoner"** in sidebar
2. Find a KIWI transaction
3. Click the dropdown in "Kategori" column
4. Select "Mat → Dagligvarer"
5. Confirm "Create rule for all with same text?"
6. ✨ All KIWI transactions are now categorized!

### Tutorial 3: Bulk Categorize

1. Type "REMA" in the search box
2. Check the checkbox for all REMA transactions
3. Blue bar appears with bulk actions
4. Select category from dropdown
5. Click "Kategoriser"
6. ✨ All REMA transactions categorized at once!

### Tutorial 4: Create Exception

1. Find one specific transaction that should be different
2. Select it (checkbox)
3. Choose different category
4. **Check "Unntak (lås transaksjoner)"**
5. Click "Kategoriser"
6. ✨ That transaction is now locked 🔒 and won't follow rules!

## 💾 Persistence

### How It Works

All changes auto-save:
- In **browser**: Saved to localStorage
- In **Node.js**: Saved to `data/persistent/` folder

### Refresh Test

1. Add some categories
2. Categorize some transactions
3. **Refresh the page** (F5)
4. ✨ Everything is still there!

### Clear Data

Open browser console (F12) and type:
```javascript
localStorage.clear()
location.reload()
```

## 🧪 Run Tests

### Test Everything

```bash
# CSV Parser
npm run test

# Category Engine
npm run category:test

# Zustand Store
npm run store:test

# Transaction Table
npm run transaction:test

# Persistence
npm run persistence:demo
```

All tests should pass! ✅

## 📖 Learn More

### Core Concepts

**Categories**
- **Hovedkategorier** (main) - e.g., "Mat", "Transport"
- **Underkategorier** (sub) - e.g., "Dagligvarer", "Bensin"
- **System categories** - "Inntekter" cannot be deleted

**Rules**
- All transactions with same "Tekst" get same category
- Created automatically or manually
- Apply to all matching transactions

**Exceptions (Locks)**
- Override rules for specific transactions
- Marked with 🔒 icon
- Used when one transaction needs different treatment

### Example Scenario

```
Most KIWI purchases are groceries:
  KIWI → Mat → Dagligvarer (rule)

But this one specific KIWI purchase was cleaning supplies:
  2025-10-15 KIWI → Husholdning (locked 🔒)
```

## 📁 Where Data is Stored

### Browser
```
localStorage['transaction-app-data']
```

### Node.js
```
data/
├── persistent/
│   ├── transactions.json
│   ├── hovedkategorier.json
│   ├── underkategorier.json
│   ├── rules.json
│   └── locks.json
└── backups/
    └── [timestamp]/
```

## 🎓 Next Steps

### Import Your Own Data

1. Place your CSV file in `data/` folder
2. Update CSV parser to point to your file
3. Import and categorize!

### Customize UI

- Edit colors in `tailwind.config.js`
- Modify components in `components/`
- Add new pages

### Add Features

- Reports and charts
- Budget tracking
- Export to PDF
- Email notifications

## 📚 Documentation

Detailed documentation for each component:

- **[README.md](./README.md)** - Overview (this file)
- **[CATEGORY_ENGINE.md](./CATEGORY_ENGINE.md)** - Rule engine details
- **[STORE.md](./STORE.md)** - Zustand store API
- **[COMPONENTS.md](./COMPONENTS.md)** - React components
- **[TRANSACTION_PAGE.md](./TRANSACTION_PAGE.md)** - Transaction table
- **[PERSISTENCE.md](./PERSISTENCE.md)** - Data persistence
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete workflows

## ❓ Common Questions

**Q: Where are my transactions?**  
A: In browser localStorage or `data/persistent/transactions.json`

**Q: How do I clear all data?**  
A: `localStorage.clear()` in browser or delete `data/persistent/` folder

**Q: Can I import my bank CSV?**  
A: Yes! Use the CSV parser with your file

**Q: What if I categorize wrong?**  
A: Just change the category - you can always recategorize

**Q: How do I share my categories with someone?**  
A: Export with `npm run persistence:demo`, share the export.json file

## 🐛 Troubleshooting

**Dev server won't start**
```bash
rm -rf node_modules
npm install
npm run dev
```

**Data not persisting**
- Check browser console for errors
- Make sure localStorage is enabled
- Check `data/persistent/` exists (Node.js)

**Categories disappeared**
- Check if you cleared localStorage
- Check backups in `data/backups/`

## 🎉 You're Ready!

Everything is set up and working. Start exploring the UI and categorizing your transactions!

Need help? Check the detailed documentation in the links above.

