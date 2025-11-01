/**
 * Sync categories from persistent files to localStorage format
 * Creates a localStorage-compatible JSON file that browser can load
 */

import { loadHovedkategorier, loadUnderkategorier, loadRules, loadLocks, loadTransactions } from '../services/persistence';
import { promises as fs } from 'fs';
import { join } from 'path';

async function syncToLocalStorage() {
  console.log('='.repeat(80));
  console.log('SYNKRONISER FILER → LOCALSTORAGE FORMAT');
  console.log('='.repeat(80));
  console.log();

  console.log('📂 Laster data fra persistent lagring...');
  console.log();

  const [hovedkategorier, underkategorier, rules, locks, transactions] = await Promise.all([
    loadHovedkategorier(),
    loadUnderkategorier(),
    loadRules(),
    loadLocks(),
    loadTransactions(),
  ]);

  console.log('✓ Lastet:');
  console.log(`  - ${hovedkategorier.size} hovedkategorier`);
  console.log(`  - ${underkategorier.size} underkategorier`);
  console.log(`  - ${rules.size} regler`);
  console.log(`  - ${locks.size} låste transaksjoner`);
  console.log(`  - ${transactions.length} transaksjoner`);
  console.log();

  // Create localStorage-compatible format
  const localStorageData = {
    version: '1.0.0',
    lastSaved: new Date().toISOString(),
    transactions,
    hovedkategorier: Array.from(hovedkategorier.entries()),
    underkategorier: Array.from(underkategorier.entries()),
    rules: Array.from(rules.entries()),
    locks: Array.from(locks.entries()),
  };

  // Save to a file that can be loaded in browser
  const outputPath = join(process.cwd(), 'public', 'initial-data.json');
  
  // Create public directory if it doesn't exist
  await fs.mkdir(join(process.cwd(), 'public'), { recursive: true });
  
  await fs.writeFile(outputPath, JSON.stringify(localStorageData, null, 2), 'utf-8');

  console.log('✓ Opprettet localStorage-kompatibel fil:');
  console.log(`  ${outputPath}`);
  console.log();

  console.log('📋 Innhold:');
  console.log(`  version: ${localStorageData.version}`);
  console.log(`  hovedkategorier: ${localStorageData.hovedkategorier.length}`);
  console.log(`  underkategorier: ${localStorageData.underkategorier.length}`);
  console.log(`  transactions: ${localStorageData.transactions.length}`);
  console.log(`  rules: ${localStorageData.rules.length}`);
  console.log();

  // Create a simple HTML page to load this data
  const loaderHTML = `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Last Kategorier</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f9fafb;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h1 { color: #1f2937; margin-bottom: 10px; }
        .info { color: #6b7280; margin-bottom: 20px; }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
        }
        button:hover { background: #2563eb; }
        .success { background: #10b981; padding: 15px; border-radius: 6px; color: white; margin-top: 20px; display: none; }
        .error { background: #ef4444; padding: 15px; border-radius: 6px; color: white; margin-top: 20px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Last Kategorier</h1>
        <p class="info">Klikk for å laste 33 kategorier til localStorage</p>
        
        <button onclick="loadData()">Last kategorier</button>
        
        <div id="success" class="success"></div>
        <div id="error" class="error"></div>
    </div>

    <script>
        async function loadData() {
            try {
                const response = await fetch('/initial-data.json');
                const data = await response.json();
                
                // Store in localStorage
                localStorage.setItem('transaction-app-data', JSON.stringify(data));
                
                document.getElementById('success').style.display = 'block';
                document.getElementById('success').textContent = 
                    '✅ Lastet ' + data.hovedkategorier.length + ' hovedkategorier og ' + 
                    data.underkategorier.length + ' underkategorier! Går til appen...';
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } catch (error) {
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = '❌ Feil: ' + error.message;
            }
        }
    </script>
</body>
</html>`;

  const loaderPath = join(process.cwd(), 'public', 'load-categories.html');
  await fs.writeFile(loaderPath, loaderHTML, 'utf-8');

  console.log('✓ Opprettet loader-side:');
  console.log(`  ${loaderPath}`);
  console.log();

  console.log('='.repeat(80));
  console.log('✅ SYNKRONISERING FULLFØRT');
  console.log('='.repeat(80));
  console.log();

  console.log('🌐 FOR Å LASTE KATEGORIENE I BROWSER:');
  console.log();
  console.log('  1. Åpne: http://localhost:3000/load-categories.html');
  console.log('  2. Klikk "Last kategorier"');
  console.log('  3. Du sendes automatisk til appen med alle kategorier!');
  console.log();
  console.log('Eller manuelt i browser console:');
  console.log('  1. Åpne http://localhost:3000');
  console.log('  2. Press F12');
  console.log('  3. Gå til Console');
  console.log('  4. Kjør:');
  console.log('     fetch("/initial-data.json").then(r=>r.json()).then(data=>{localStorage.setItem("transaction-app-data",JSON.stringify(data));location.reload()})');
  console.log();
}

syncToLocalStorage().catch(console.error);

