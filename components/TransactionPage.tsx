/**
 * Transaction Management Page
 * Complete interface for viewing, filtering, and categorizing transactions
 */

import React, { useState, useMemo, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTransactionStore, selectFilteredTransactions, selectHovedkategorier } from '../src/store';
import { CategorizedTransaction } from '../src/store';
import { Sidebar } from './Sidebar';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Checkbox } from './ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { parseCSV } from '../csvParser';
import { generateTransactionId } from '../categoryEngine';
import { saveToBrowser } from '../services/browserPersistence';

// ============================================================================
// Transaction Filter Bar Component
// ============================================================================

interface TransactionFilterBarProps {
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  searchValue: string;
  dateFromValue: string;
  dateToValue: string;
  typeValue: string;
  categoryValue: string;
  onClearFilters: () => void;
}

const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onTypeChange,
  onCategoryChange,
  searchValue,
  dateFromValue,
  dateToValue,
  typeValue,
  categoryValue,
  onClearFilters,
}) => {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const getHovedkategoriWithUnderkategorier = useTransactionStore(
    (state) => state.getHovedkategoriWithUnderkategorier
  );

  // Get all categories flat for dropdown
  // Rules: Only show subcategories OR hovedkategorier without subcategories (like Overført)
  const allCategories = useMemo(() => {
    const cats: Array<{ id: string; name: string; isSubcategory: boolean }> = [];
    
    hovedkategorier.forEach((hk) => {
      const details = getHovedkategoriWithUnderkategorier(hk.id);
      const hasSubcategories = details?.underkategorier && details.underkategorier.length > 0;
      
      // Only add hovedkategori if it has NO subcategories (e.g., Overført)
      if (!hasSubcategories) {
        cats.push({ id: hk.id, name: hk.name, isSubcategory: false });
      }
      
      // Always add all underkategorier (without bullet)
      details?.underkategorier.forEach((uk) => {
        cats.push({ id: uk.id, name: uk.name, isSubcategory: true });
      });
    });
    
    // Sort alphabetically by name
    return cats.sort((a, b) => a.name.localeCompare(b.name, 'no'));
  }, [hovedkategorier, getHovedkategoriWithUnderkategorier]);

  const hasActiveFilters = searchValue || dateFromValue || dateToValue || typeValue || categoryValue;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filtre</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Nullstill filtre
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium mb-1 block">Søk</label>
            <Input
              type="text"
              placeholder="Søk i tekst, konto..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Date From */}
          <div>
            <label className="text-sm font-medium mb-1 block">Fra dato</label>
            <Input
              type="date"
              value={dateFromValue}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-sm font-medium mb-1 block">Til dato</label>
            <Input
              type="date"
              value={dateToValue}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Type</label>
            <Select value={typeValue} onChange={(e) => onTypeChange(e.target.value)}>
              <option value="">Alle typer</option>
              <option value="Betaling">Betaling</option>
              <option value="Overføring">Overføring</option>
              <option value="Renter">Renter</option>
              <option value="Avtalegiro">Avtalegiro</option>
              <option value="Efaktura">Efaktura</option>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium mb-1 block">Kategori</label>
            <Select
              value={categoryValue}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Alle kategorier</option>
              <option value="__uncategorized">Ukategorisert</option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Bulk Action Bar Component
// ============================================================================

interface BulkActionBarProps {
  selectedCount: number;
  onCategorize: (categoryId: string, asException: boolean) => void;
  onDeselectAll: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onCategorize,
  onDeselectAll,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [asException, setAsException] = useState(false);

  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const getHovedkategoriWithUnderkategorier = useTransactionStore(
    (state) => state.getHovedkategoriWithUnderkategorier
  );

  // Get all categories flat for dropdown
  // Rules: Only show subcategories OR hovedkategorier without subcategories (like Overført)
  const allCategories = useMemo(() => {
    const cats: Array<{ id: string; name: string; isSubcategory: boolean }> = [];
    
    hovedkategorier.forEach((hk) => {
      const details = getHovedkategoriWithUnderkategorier(hk.id);
      const hasSubcategories = details?.underkategorier && details.underkategorier.length > 0;
      
      // Only add hovedkategori if it has NO subcategories (e.g., Overført)
      if (!hasSubcategories) {
        cats.push({ id: hk.id, name: hk.name, isSubcategory: false });
      }
      
      // Always add all underkategorier (without bullet)
      details?.underkategorier.forEach((uk) => {
        cats.push({ id: uk.id, name: uk.name, isSubcategory: true });
      });
    });
    
    // Sort alphabetically by name
    return cats.sort((a, b) => a.name.localeCompare(b.name, 'no'));
  }, [hovedkategorier, getHovedkategoriWithUnderkategorier]);

  const handleCategorize = () => {
    if (selectedCategory) {
      onCategorize(selectedCategory, asException);
      setSelectedCategory('');
      setAsException(false);
    }
  };

  return (
    <Card className="mb-4 bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-blue-900">
            {selectedCount} transaksjon{selectedCount !== 1 ? 'er' : ''} valgt
          </div>

          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Velg kategori...</option>
                <option value="__uncategorized">Ukategorisert</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={asException}
                onChange={(e) => setAsException(e.target.checked)}
              />
              <span>Unntak (lås transaksjoner)</span>
            </label>

            <Button
              onClick={handleCategorize}
              disabled={!selectedCategory}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Kategoriser
            </Button>

            <Button variant="outline" onClick={onDeselectAll}>
              Avbryt
            </Button>
          </div>
        </div>

        {asException && (
          <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            🔒 Transaksjoner vil bli låst som unntak og ikke påvirkes av regler
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Transaction Row Component
// ============================================================================

interface TransactionRowProps {
  transaction: CategorizedTransaction;
  isSelected: boolean;
  onToggleSelect: () => void;
  onCategorize: (categoryId: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  isSelected,
  onToggleSelect,
  onCategorize,
}) => {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const getHovedkategoriWithUnderkategorier = useTransactionStore(
    (state) => state.getHovedkategoriWithUnderkategorier
  );

  // Get all categories flat for dropdown
  // Rules: Only show subcategories OR hovedkategorier without subcategories (like Overført)
  const allCategories = useMemo(() => {
    const cats: Array<{ id: string; name: string; isSubcategory: boolean }> = [];
    
    hovedkategorier.forEach((hk) => {
      const details = getHovedkategoriWithUnderkategorier(hk.id);
      const hasSubcategories = details?.underkategorier && details.underkategorier.length > 0;
      
      // Only add hovedkategori if it has NO subcategories (e.g., Overført)
      if (!hasSubcategories) {
        cats.push({ id: hk.id, name: hk.name, isSubcategory: false });
      }
      
      // Always add all underkategorier (without bullet)
      details?.underkategorier.forEach((uk) => {
        cats.push({ id: uk.id, name: uk.name, isSubcategory: true });
      });
    });
    
    // Sort alphabetically by name
    return cats.sort((a, b) => a.name.localeCompare(b.name, 'no'));
  }, [hovedkategorier, getHovedkategoriWithUnderkategorier]);

  // Format amount without decimals
  const formattedAmount = Math.round(transaction.beløp).toString();
  const amountColor = transaction.beløp >= 0 ? 'text-green-600' : 'text-red-600';

  // Format date to Norwegian short format (dd.mm.yy)
  const formatDateShort = (dateStr: string): string => {
    // Input format: YYYY-MM-DD or DD.MM.YYYY
    if (dateStr.includes('.')) {
      // Already in DD.MM.YYYY format, convert to dd.mm.yy
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day}.${month}.${year.slice(-2)}`;
      }
      return dateStr;
    } else if (dateStr.includes('-')) {
      // YYYY-MM-DD format, convert to dd.mm.yy
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}.${month}.${year.slice(-2)}`;
      }
      return dateStr;
    }
    return dateStr;
  };

  return (
    <TableRow data-state={isSelected ? 'selected' : undefined}>
      {/* Checkbox */}
      <TableCell className="w-12">
        <Checkbox checked={isSelected} onChange={onToggleSelect} />
      </TableCell>

      {/* Date */}
      <TableCell className="font-medium whitespace-nowrap">
        {formatDateShort(transaction.dato)}
      </TableCell>

      {/* Amount */}
      <TableCell className={`font-semibold whitespace-nowrap ${amountColor}`}>
        {formattedAmount}
      </TableCell>

      {/* Type */}
      <TableCell className="text-sm text-gray-600">
        {transaction.type}
      </TableCell>

      {/* Text */}
      <TableCell className="max-w-xs truncate">
        {transaction.tekst}
      </TableCell>

      {/* Underkategori (from CSV, read-only) */}
      <TableCell className="text-sm text-gray-500 italic">
        {transaction.underkategori || '-'}
      </TableCell>

      {/* Category (dropdown) */}
      <TableCell className="max-w-[12rem]">
        <div className="flex items-center gap-2">
          {transaction.isLocked && (
            <span className="text-amber-600" title="Låst som unntak">
              🔒
            </span>
          )}
          <Select
            value={transaction.categoryId || ''}
            onChange={(e) => onCategorize(e.target.value)}
            disabled={transaction.isLocked}
            className="text-sm"
          >
            <option value="">Velg kategori...</option>
            <option value="__uncategorized">Ukategorisert</option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>
      </TableCell>

      {/* Til konto */}
      <TableCell className="text-sm text-gray-600">
        {transaction.tilKonto || '-'}
      </TableCell>

      {/* Til kontonummer */}
      <TableCell className="text-sm text-gray-600 font-mono">
        {transaction.tilKontonummer || '-'}
      </TableCell>

      {/* Fra konto */}
      <TableCell className="text-sm text-gray-600">
        {transaction.fraKonto || '-'}
      </TableCell>

      {/* Fra kontonummer */}
      <TableCell className="text-sm text-gray-600 font-mono">
        {transaction.fraKontonummer || '-'}
      </TableCell>
    </TableRow>
  );
};

// ============================================================================
// Main Transaction Page Component
// ============================================================================

interface TransactionPageProps {
  onNavigate?: (page: string) => void;
}

type SortField = 'tekst' | 'beløp' | 'dato' | null;
type SortDirection = 'asc' | 'desc' | null;

export const TransactionPage: React.FC<TransactionPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('transaksjoner');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 250;
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('dato');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Local state for filters
  const [searchValue, setSearchValue] = useState('');
  const [dateFromValue, setDateFromValue] = useState('');
  const [dateToValue, setDateToValue] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Store state and actions
  const transactions = useTransactionStore((state) => state.transactions);
  const stats = useTransactionStore((state) => state.stats);
  const selection = useTransactionStore((state) => state.selection);
  
  const selectTransaction = useTransactionStore((state) => state.selectTransaction);
  const deselectTransaction = useTransactionStore((state) => state.deselectTransaction);
  const selectAll = useTransactionStore((state) => state.selectAll);
  const deselectAll = useTransactionStore((state) => state.deselectAll);
  const categorizeTransactionAction = useTransactionStore(
    (state) => state.categorizeTransactionAction
  );
  const bulkCategorize = useTransactionStore((state) => state.bulkCategorize);
  const setFilters = useTransactionStore((state) => state.setFilters);

  // Sync filters to store whenever they change
  React.useEffect(() => {
    const categoryIds = categoryValue === '__uncategorized' 
      ? [] 
      : categoryValue 
      ? [categoryValue] 
      : [];
    
    const types = typeValue ? [typeValue] : [];
    
    setFilters({
      search: searchValue,
      dateFrom: dateFromValue || undefined,
      dateTo: dateToValue || undefined,
      categoryIds,
      types,
      showOnlyUncategorized: categoryValue === '__uncategorized',
    });
  }, [searchValue, dateFromValue, dateToValue, typeValue, categoryValue, setFilters]);

  // Use filtered transactions from store (already filtered)
  const filteredTransactions = useTransactionStore(selectFilteredTransactions);

  // Apply sorting to filtered transactions
  const sortedTransactions = React.useMemo(() => {
    const toTimestamp = (dateStr: string): number => {
      if (!dateStr) return 0;
      if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const [day, month, yearRaw] = parts;
          const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
          return new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
          ).getTime();
        }
      } else if (dateStr.includes('-')) {
        return new Date(dateStr).getTime();
      }
      return new Date(dateStr).getTime();
    };

    if (!sortField || !sortDirection) {
      return filteredTransactions;
    }

    const sorted = [...filteredTransactions];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'tekst') {
        comparison = a.tekst.localeCompare(b.tekst, 'no');
      } else if (sortField === 'beløp') {
        comparison = a.beløp - b.beløp;
      } else if (sortField === 'dato') {
        comparison = toTimestamp(a.dato) - toTimestamp(b.dato);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredTransactions, sortField, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sorting change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, dateFromValue, dateToValue, typeValue, categoryValue, sortField, sortDirection]);

  const handleClearFilters = () => {
    setSearchValue('');
    setDateFromValue('');
    setDateToValue('');
    setTypeValue('');
    setCategoryValue('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // New field: start with asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleSelection = (id: string, isSelected: boolean) => {
    if (isSelected) {
      deselectTransaction(id);
    } else {
      selectTransaction(id);
    }
  };

  const handleToggleSelectAll = () => {
    if (selection.isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const handleCategorize = (transactionId: string, categoryId: string) => {
    if (categoryId === '__uncategorized') {
      // Uncategorize: set categoryId to undefined and unlock if locked
      const unlockTransactionAction = useTransactionStore.getState().unlockTransactionAction;
      unlockTransactionAction(transactionId);
      return;
    }
    
    if (categoryId) {
      // Automatically create rule based on transaction text (no confirmation dialog)
      categorizeTransactionAction(transactionId, categoryId, true);
    }
  };

  const handleBulkCategorize = (categoryId: string, asException: boolean) => {
    const selectedIds = Array.from(selection.selectedIds);
    
    bulkCategorize({
      transactionIds: selectedIds,
      categoryId,
      createRule: !asException,
      lockTransactions: asException,
      lockReason: asException ? 'Bulk-kategorisering som unntak' : undefined,
    });
  };

  // CSV Import Handler
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      // Read file content
      const fileContent = await file.text();

      // Parse CSV (all rows, no internal duplicate checking)
      const parseResult = parseCSV(fileContent);

      console.log(`📄 CSV parsed: ${parseResult.originalCount} transaksjoner`);

      // Convert to categorized transactions with UUID
      const newTransactions = parseResult.transactions.map((tx) => ({
        ...tx,
        id: crypto.randomUUID(), // Unique UUID for each transaction
        transactionId: generateTransactionId(tx), // Content hash for duplicate detection
        categoryId: undefined,
        isLocked: false,
      }));

      // Check for duplicates against existing transactions in store
      // Uses transactionId (content hash) for duplicate detection
      // Note: New transactions already have UUID (id), but duplicates are matched by content
      const existingContentHashes = new Set(transactions.map((t) => t.transactionId));
      const duplicateTransactions = newTransactions.filter(
        (tx) => existingContentHashes.has(tx.transactionId)
      );
      const uniqueNewTransactions = newTransactions.filter(
        (tx) => !existingContentHashes.has(tx.transactionId)
      );

      const duplicatesCount = duplicateTransactions.length;
      const newCount = uniqueNewTransactions.length;

      console.log(`📊 Import analysis:`);
      console.log(`   CSV rows parsed: ${parseResult.originalCount}`);
      console.log(`   Existing in store: ${transactions.length}`);
      console.log(`   New transactions: ${newCount}`);
      console.log(`   Duplicates skipped: ${duplicatesCount}`);
      
      // Log duplicates if any
      if (duplicatesCount > 0) {
        console.log(`\n⛔ Duplikater funnet (viser de ${Math.min(10, duplicatesCount)} første):`);
        duplicateTransactions.slice(0, 10).forEach((dup, i) => {
          const beløp = Math.round(dup.beløp);
          const arrow = dup.beløp < 0 ? '→' : '←';
          console.log(`   ${i + 1}. [${dup.dato}] ${beløp} kr • ${dup.tekst} • ${dup.fraKontonummer || 'N/A'} ${arrow} ${dup.tilKontonummer || 'N/A'}`);
          console.log(`       Content hash: ${dup.transactionId.substring(0, 50)}...`);
        });
      }

      if (uniqueNewTransactions.length === 0) {
        const message = `ℹ️ Ingen nye transaksjoner - alle ${duplicatesCount} finnes allerede i systemet`;
        setImportStatus(message);
        console.log(`\n${message}`);
        return;
      }

      console.log(`\n✨ Importing ${newCount} new transactions with UUID...`);

      // Combine with existing transactions
      const allTransactions = [...transactions, ...uniqueNewTransactions];

      // Import to store
      const importTransactions = useTransactionStore.getState().importTransactions;
      importTransactions(allTransactions);

      // Auto-categorize with existing rules
      const applyRulesToAll = useTransactionStore.getState().applyRulesToAll;
      applyRulesToAll();

      // Get categorization stats
      const currentState = useTransactionStore.getState();
      const autoCategorized = uniqueNewTransactions.filter((tx) => {
        const updated = currentState.transactions.find((t) => t.id === tx.id);
        return updated && updated.categoryId;
      }).length;

      // Save to persistence
      saveToBrowser();

      // Show success message with detailed stats
      const message = `✅ Importert ${newCount} nye transaksjoner • ${autoCategorized} auto-kategorisert • ${duplicatesCount} duplikater ignorert`;
      setImportStatus(message);

      console.log('\n✅ Import fullført:');
      console.log(`   CSV rows: ${parseResult.originalCount}`);
      console.log(`   Nye transaksjoner: ${newCount} (hver med unik UUID)`);
      console.log(`   Auto-kategorisert: ${autoCategorized}`);
      console.log(`   Duplikater ignorert: ${duplicatesCount}`);
      console.log(`   Total i system: ${currentState.transactions.length}`);
    } catch (error) {
      console.error('Import feilet:', error);
      setImportStatus(`❌ Feil ved import: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const selectedCount = selection.selectedIds.size;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaksjoner</h1>
              <p className="text-gray-600 mt-2">
                {stats.total} transaksjoner totalt • {stats.categorized} kategorisert • {stats.uncategorized} ukategorisert
              </p>
            </div>

            {/* Import CSV Button */}
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={handleImportClick}
                disabled={isImporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImporting ? '⏳ Importerer...' : '📄 Importer CSV'}
              </Button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />

              {/* Import status message */}
              {importStatus && (
                <div className={`text-sm px-3 py-1 rounded ${
                  importStatus.startsWith('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : importStatus.startsWith('❌')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <TransactionFilterBar
          onSearchChange={setSearchValue}
          onDateFromChange={setDateFromValue}
          onDateToChange={setDateToValue}
          onTypeChange={setTypeValue}
          onCategoryChange={setCategoryValue}
          searchValue={searchValue}
          dateFromValue={dateFromValue}
          dateToValue={dateToValue}
          typeValue={typeValue}
          categoryValue={categoryValue}
          onClearFilters={handleClearFilters}
        />

        {/* Bulk Action Bar */}
        {selectedCount > 0 && (
          <BulkActionBar
            selectedCount={selectedCount}
            onCategorize={handleBulkCategorize}
            onDeselectAll={deselectAll}
          />
        )}

        {/* Transaction Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selection.isAllSelected}
                    onChange={handleToggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('dato')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Dato
                    {sortField === 'dato' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('beløp')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Beløp
                    {sortField === 'beløp' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('tekst')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Tekst
                    {sortField === 'tekst' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Underkategori</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Til konto</TableHead>
                <TableHead>Til kontonummer</TableHead>
                <TableHead>Fra konto</TableHead>
                <TableHead>Fra kontonummer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    isSelected={selection.selectedIds.has(transaction.id)}
                    onToggleSelect={() =>
                      handleToggleSelection(
                        transaction.id,
                        selection.selectedIds.has(transaction.id)
                      )
                    }
                    onCategorize={(categoryId) =>
                      handleCategorize(transaction.transactionId, categoryId)
                    }
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                    Ingen transaksjoner funnet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Viser {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} av {sortedTransactions.length} transaksjoner
              {selectedCount > 0 && ` • ${selectedCount} valgt`}
              {sortField && sortDirection && (
                <span className="ml-2 text-blue-600">
                  • Sortert etter {sortField === 'beløp' ? 'Beløp' : 'Tekst'} ({sortDirection === 'asc' ? 'stigende' : 'synkende'})
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Forrige
              </Button>
              
              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show first page, current page +/- 1, and last page
                  let pageNum: number;
                  
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Neste →
              </Button>
            </div>
          </div>
        )}
        
        {/* Footer info - show even without pagination */}
        {totalPages <= 1 && (
          <div className="mt-4 text-sm text-gray-600">
            Viser {sortedTransactions.length} av {stats.total} transaksjoner
            {selectedCount > 0 && ` • ${selectedCount} valgt`}
            {sortField && sortDirection && (
              <span className="ml-2 text-blue-600">
                • Sortert etter {sortField === 'beløp' ? 'Beløp' : 'Tekst'} ({sortDirection === 'asc' ? 'stigende' : 'synkende'})
              </span>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;

