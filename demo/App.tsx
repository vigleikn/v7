import React, { useState, useEffect } from 'react';
import { CategoryPage } from '../components/CategoryPage';
import { TransactionPage } from '../components/TransactionPage';
import { useTransactionStore } from '../store';
import { generateTransactionId } from '../categoryEngine';
import { setupBrowserPersistence } from '../services/browserPersistence';
import '../styles/globals.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'kategorier' | 'transaksjoner'>('transaksjoner');
  const [isInitialized, setIsInitialized] = useState(false);
  const importTransactions = useTransactionStore((state) => state.importTransactions);
  const transactions = useTransactionStore((state) => state.transactions);

  // Initialize persistence on mount
  useEffect(() => {
    console.log('🚀 Initializing app with persistence...');
    
    // Setup browser persistence (loads data + auto-save)
    const unsubscribe = setupBrowserPersistence();
    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Load sample transactions on mount if no data exists
  useEffect(() => {
    if (isInitialized && transactions.length === 0) {
      console.log('📝 No data found, loading sample transactions...');
      const sampleTransactions = [
        {
          dato: '2025-10-01',
          beløp: -235,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'KIWI TRONDHEIM',
          underkategori: 'Dagligvarer',
        },
        {
          dato: '2025-10-02',
          beløp: -189,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'KIWI TRONDHEIM',
          underkategori: 'Dagligvarer',
        },
        {
          dato: '2025-10-03',
          beløp: -456,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'KIWI TRONDHEIM',
          underkategori: 'Dagligvarer',
        },
        {
          dato: '2025-10-04',
          beløp: -299,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'REMA 1000',
          underkategori: 'Dagligvarer',
        },
        {
          dato: '2025-10-05',
          beløp: 5000,
          tilKonto: 'Felles',
          tilKontonummer: '3610.61.63558',
          fraKonto: '',
          fraKontonummer: '',
          type: 'Renter',
          tekst: 'KREDITRENTER',
          underkategori: 'Renter',
        },
        {
          dato: '2025-10-06',
          beløp: -350,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'CIRCLE K DRIVSTOFF',
          underkategori: '',
        },
        {
          dato: '2025-10-07',
          beløp: -129,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'Netflix',
          underkategori: 'Strømmetjenester',
        },
        {
          dato: '2025-10-08',
          beløp: -219,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'Spotify',
          underkategori: 'Musikk',
        },
        {
          dato: '2025-10-09',
          beløp: -2122,
          tilKonto: '',
          tilKontonummer: '1503.33.93919',
          fraKonto: 'Regninger',
          fraKontonummer: '3610.62.06117',
          type: 'Efaktura',
          tekst: 'TOBB/Klare Finans as',
          underkategori: 'Husleie',
        },
        {
          dato: '2025-10-10',
          beløp: -3052,
          tilKonto: '',
          tilKontonummer: '',
          fraKonto: 'Felles',
          fraKontonummer: '3610.61.63558',
          type: 'Betaling',
          tekst: 'Norwegian Air',
          underkategori: 'Fly',
        },
      ];

      const categorizedTransactions = sampleTransactions.map((tx) => ({
        ...tx,
        transactionId: generateTransactionId(tx),
        categoryId: undefined,
        isLocked: false,
      }));

      importTransactions(categorizedTransactions);
      console.log(`✓ Loaded ${sampleTransactions.length} sample transactions`);
    }
  }, [isInitialized, importTransactions, transactions.length]);

  const handleNavigate = (page: string) => {
    if (page === 'kategorier' || page === 'transaksjoner') {
      setCurrentPage(page);
    }
  };

  // Render based on current page
  if (currentPage === 'kategorier') {
    return <CategoryPage onNavigate={handleNavigate} />;
  }

  return <TransactionPage onNavigate={handleNavigate} />;
}

export default App;

