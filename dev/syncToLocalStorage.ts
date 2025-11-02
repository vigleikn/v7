/**
 * Sync Categories to Browser localStorage Format
 * Loads categories from persistent storage and saves them in the format
 * that the browser application expects (localStorage compatible)
 */

import { loadAll } from '../services/persistence';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function syncToLocalStorage() {
  console.log('🔄 Syncing categories to localStorage format...\n');

  // Load from Node.js persistent storage
  const data = await loadAll();

  console.log('📦 Loaded from persistent storage:');
  console.log(`  - Hovedkategorier: ${data.hovedkategorier.length}`);
  console.log(`  - Underkategorier: ${data.underkategorier.length}`);
  console.log(`  - Transactions: ${data.transactions.length}\n`);

  // Create localStorage-compatible format
  const localStorageData = {
    state: {
      hovedkategorier: data.hovedkategorier,
      underkategorier: data.underkategorier,
      transactions: data.transactions,
      rules: data.rules,
      locks: data.locks,
      filters: {
        search: '',
        categoryIds: [],
        types: [],
        showOnlyUncategorized: false,
        showOnlyLocked: false,
      },
      selection: {
        selectedIds: [],
        isAllSelected: false,
        selectionMode: 'none',
      },
      isLoading: false,
      error: null,
      stats: {
        total: 0,
        categorized: 0,
        uncategorized: 0,
        locked: 0,
        uniqueTekstPatterns: 0,
        patternsWithRules: 0,
      },
    },
    version: 0,
  };

  // Save to public directory for easy browser access
  const outputPath = join(process.cwd(), 'public', 'initial-data.json');
  await writeFile(outputPath, JSON.stringify(localStorageData, null, 2));

  console.log(`✅ Saved to: ${outputPath}`);
  console.log('\n📋 Instructions for browser:');
  console.log('  1. Start the dev server: npm run dev');
  console.log('  2. Open browser console at http://localhost:3000');
  console.log('  3. Run this command:\n');
  console.log('     fetch("/initial-data.json")');
  console.log('       .then(r => r.json())');
  console.log('       .then(data => {');
  console.log('         localStorage.setItem("transaction-store", JSON.stringify(data));');
  console.log('         location.reload();');
  console.log('       });\n');
  console.log('  Or use the load-categories.html helper page!\n');

  // Also create an HTML helper file
  const htmlPath = join(process.cwd(), 'public', 'load-categories.html');
  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Load Categories - Personal Finance Tool</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 30px;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin: 10px 5px;
    }
    button:hover {
      background: #2563eb;
    }
    .success {
      background: #10b981;
    }
    .danger {
      background: #ef4444;
    }
    .info {
      background: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
    }
    .stats {
      background: white;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .stats h3 {
      margin-top: 0;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      padding: 5px 0;
    }
    li::before {
      content: "✓ ";
      color: #10b981;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏦 Load Categories into Browser</h1>
    
    <div class="info">
      <strong>What this does:</strong> Loads the pre-configured categories (Inntekter, Sparing, Overført, 
      FORUTSIGBARE UTGIFTER, UFORUTSIGBARE UTGIFTER, LIVSOPPHOLD) into your browser's localStorage.
    </div>

    <div class="stats" id="stats" style="display:none;">
      <h3>Current Data in localStorage:</h3>
      <ul id="currentStats"></ul>
    </div>

    <div style="margin: 30px 0;">
      <button onclick="loadCategories()">📥 Load Categories</button>
      <button onclick="checkCurrentData()">🔍 Check Current Data</button>
      <button onclick="clearData()" class="danger">🗑️ Clear All Data</button>
      <button onclick="goToApp()">🚀 Open App</button>
    </div>

    <div id="message" style="margin-top: 20px;"></div>
  </div>

  <script>
    function showMessage(text, isError = false) {
      const msg = document.getElementById('message');
      msg.innerHTML = '<div class="info" style="border-color: ' + (isError ? '#ef4444' : '#10b981') + ';">' + text + '</div>';
    }

    async function loadCategories() {
      try {
        showMessage('Loading categories from server...');
        
        const response = await fetch('/initial-data.json');
        const data = await response.json();
        
        // Save to localStorage
        localStorage.setItem('transaction-store', JSON.stringify(data));
        
        // Show success message
        const hovedkat = data.state.hovedkategorier?.length || 0;
        const underkat = data.state.underkategorier?.length || 0;
        
        showMessage(\`
          <strong>✅ Success!</strong><br><br>
          Loaded <strong>\${hovedkat} hovedkategorier</strong> and <strong>\${underkat} underkategorier</strong><br><br>
          Categories:<br>
          • 💰 Inntekter (with 3 subcategories)<br>
          • 💎 Sparing<br>
          • ↔️ Overført<br>
          • 📁 FORUTSIGBARE UTGIFTER (11 subcategories)<br>
          • 📁 UFORUTSIGBARE UTGIFTER (9 subcategories)<br>
          • 📁 LIVSOPPHOLD (7 subcategories)<br><br>
          <strong>Next:</strong> Click "Open App" or refresh your app page.
        \`);
        
        checkCurrentData();
      } catch (error) {
        showMessage('❌ Error loading categories: ' + error.message, true);
        console.error(error);
      }
    }

    function checkCurrentData() {
      const stored = localStorage.getItem('transaction-store');
      const statsDiv = document.getElementById('stats');
      const statsList = document.getElementById('currentStats');
      
      if (!stored) {
        statsList.innerHTML = '<li style="color: #ef4444;">No data in localStorage</li>';
        statsDiv.style.display = 'block';
        return;
      }

      try {
        const data = JSON.parse(stored);
        const hovedkat = data.state?.hovedkategorier?.length || 0;
        const underkat = data.state?.underkategorier?.length || 0;
        const trans = data.state?.transactions?.length || 0;
        const rules = data.state?.rules?.length || 0;
        
        statsList.innerHTML = \`
          <li>Hovedkategorier: \${hovedkat}</li>
          <li>Underkategorier: \${underkat}</li>
          <li>Transactions: \${trans}</li>
          <li>Rules: \${rules}</li>
        \`;
        statsDiv.style.display = 'block';
      } catch (error) {
        statsList.innerHTML = '<li style="color: #ef4444;">Error reading data</li>';
        statsDiv.style.display = 'block';
      }
    }

    function clearData() {
      if (confirm('Are you sure you want to clear all data from localStorage?')) {
        localStorage.removeItem('transaction-store');
        showMessage('🗑️ All data cleared from localStorage');
        checkCurrentData();
      }
    }

    function goToApp() {
      window.location.href = '/';
    }

    // Check on load
    window.onload = checkCurrentData;
  </script>
</body>
</html>`;

  await writeFile(htmlPath, html);
  console.log(`✅ Created helper page: ${htmlPath}`);
  console.log('\n🌐 To load categories in browser:');
  console.log('  1. npm run dev');
  console.log('  2. Visit: http://localhost:3000/load-categories.html');
  console.log('  3. Click "Load Categories"\n');
}

syncToLocalStorage()
  .then(() => {
    console.log('✨ Sync complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
