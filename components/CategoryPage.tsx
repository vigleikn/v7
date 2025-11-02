/**
 * Category Management Page
 * Complete admin interface for managing hovedkategorier and underkategorier
 */

import React, { useState } from 'react';
import { useTransactionStore, selectHovedkategorier } from '../store';
import { Hovedkategori, Underkategori } from '../store';
import { Sidebar } from './Sidebar';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';

// ============================================================================
// New Subcategory Input Component
// ============================================================================

interface NewSubcategoryInputProps {
  hovedkategoriId: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}

const NewSubcategoryInput: React.FC<NewSubcategoryInputProps> = ({
  hovedkategoriId,
  onCancel,
  onSave,
}) => {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
      <Input
        type="text"
        placeholder="Navn på underkategori..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!name.trim()}
      >
        Lagre
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
      >
        Avbryt
      </Button>
    </div>
  );
};

// ============================================================================
// Bulk Add Subcategories Component
// ============================================================================

interface BulkAddSubcategoriesProps {
  hovedkategoriId: string;
  existingSubcategories: Underkategori[];
  onCancel: () => void;
  onSave: (names: string[]) => void;
}

const BulkAddSubcategories: React.FC<BulkAddSubcategoriesProps> = ({
  hovedkategoriId,
  existingSubcategories,
  onCancel,
  onSave,
}) => {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<{ valid: number; duplicates: number; empty: number } | null>(null);

  const parseLines = (input: string) => {
    const lines = input.split('\n').map(line => line.trim());
    const existing = new Set(existingSubcategories.map(sub => sub.name.toLowerCase()));
    
    const valid: string[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    let empty = 0;

    lines.forEach(line => {
      if (!line) {
        empty++;
        return;
      }

      const lowerLine = line.toLowerCase();
      
      // Check if already exists or is duplicate in current input
      if (existing.has(lowerLine) || seen.has(lowerLine)) {
        duplicates++;
        return;
      }

      seen.add(lowerLine);
      valid.push(line);
    });

    return { valid, duplicates, empty };
  };

  const handleSave = () => {
    const result = parseLines(text);
    if (result.valid.length > 0) {
      onSave(result.valid);
      setText('');
      setFeedback(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    // Show live feedback
    if (newText.trim()) {
      const result = parseLines(newText);
      setFeedback({
        valid: result.valid.length,
        duplicates: result.duplicates,
        empty: result.empty,
      });
    } else {
      setFeedback(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Esc = Cancel
    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    
    // Ctrl+Enter or Cmd+Enter = Save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-blue-900">
          📝 Legg til flere underkategorier
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6 p-0 text-blue-700 hover:text-blue-900"
        >
          ✕
        </Button>
      </div>

      <Textarea
        placeholder="Skriv inn underkategorier, én per linje...&#10;&#10;Eksempel:&#10;Dagligvarer&#10;Mat ute&#10;Klær"
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        autoFocus
        className="min-h-[120px] font-mono text-sm"
      />

      {/* Live feedback */}
      {feedback && (
        <div className="text-xs space-y-1 text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓ {feedback.valid} vil bli opprettet</span>
          </div>
          {feedback.duplicates > 0 && (
            <div className="text-orange-600">
              ⚠ {feedback.duplicates} duplikat(er) vil bli ignorert
            </div>
          )}
          {feedback.empty > 0 && (
            <div className="text-gray-500">
              · {feedback.empty} tomme linje(r)
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Esc</kbd> avbryt
          {' · '}
          <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl</kbd>+
          <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Enter</kbd> lagre
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
          >
            Avbryt
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!feedback || feedback.valid === 0}
          >
            Lagre {feedback && feedback.valid > 0 ? `(${feedback.valid})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Edit Category Name Component
// ============================================================================

interface EditCategoryNameProps {
  currentName: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}

const EditCategoryName: React.FC<EditCategoryNameProps> = ({
  currentName,
  onCancel,
  onSave,
}) => {
  const [name, setName] = useState(currentName);

  const handleSave = () => {
    if (name.trim() && name.trim() !== currentName) {
      onSave(name.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!name.trim()}
      >
        Lagre
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
      >
        Avbryt
      </Button>
    </div>
  );
};

// ============================================================================
// Delete Category Dialog Component
// ============================================================================

interface DeleteCategoryDialogProps {
  open: boolean;
  categoryName: string;
  transactionCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({
  open,
  categoryName,
  transactionCount = 0,
  onCancel,
  onConfirm,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett kategori?</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker på at du vil slette kategorien "{categoryName}"?
            {transactionCount > 0 && (
              <span className="block mt-2 text-orange-600 font-medium">
                ⚠️ Denne kategorien har {transactionCount} transaksjon(er). Disse vil bli ukategoriserte.
              </span>
            )}
            <span className="block mt-2">
              Denne handlingen kan ikke angres.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Avbryt
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Slett kategori
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ============================================================================
// Category Card Component
// ============================================================================

interface CategoryCardProps {
  hovedkategori: Hovedkategori;
  underkategorier: Underkategori[];
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  hovedkategori,
  underkategorier,
}) => {
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState<string | null>(null);

  // Store actions
  const createUnderkategori = useTransactionStore((state) => state.createUnderkategori);
  const updateHovedkategori = useTransactionStore((state) => state.updateHovedkategori);
  const updateUnderkategori = useTransactionStore((state) => state.updateUnderkategori);
  const deleteHovedkategori = useTransactionStore((state) => state.deleteHovedkategori);
  const deleteUnderkategori = useTransactionStore((state) => state.deleteUnderkategori);
  const transactions = useTransactionStore((state) => state.transactions);

  // Count transactions in this category
  const transactionCount = transactions.filter(
    (t) => t.categoryId === hovedkategori.id ||
      underkategorier.some((u) => u.id === t.categoryId)
  ).length;

  const handleAddSubcategory = (name: string) => {
    createUnderkategori(name, hovedkategori.id);
    setShowNewSubcategory(false);
  };

  const handleBulkAddSubcategories = (names: string[]) => {
    // Use the optimized bulk add function
    const addSubcategoriesBulk = useTransactionStore.getState().addSubcategoriesBulk;
    addSubcategoriesBulk(hovedkategori.id, names);
    setShowBulkAdd(false);
  };

  const handleUpdateHovedkategori = (name: string) => {
    updateHovedkategori(hovedkategori.id, { name });
    setEditingName(false);
  };

  const handleUpdateUnderkategori = (id: string, name: string) => {
    updateUnderkategori(id, { name });
    setEditingSubcategoryId(null);
  };

  const handleDeleteHovedkategori = () => {
    deleteHovedkategori(hovedkategori.id);
    setShowDeleteDialog(false);
  };

  const handleDeleteUnderkategori = (id: string) => {
    deleteUnderkategori(id);
    setDeletingSubcategoryId(null);
  };

  const deletingSubcategory = underkategorier.find((u) => u.id === deletingSubcategoryId);
  const deletingSubcategoryTransactionCount = deletingSubcategory
    ? transactions.filter((t) => t.categoryId === deletingSubcategory.id).length
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          {/* Header with category name and actions */}
          <div className="flex items-center justify-between">
            {editingName ? (
              <EditCategoryName
                currentName={hovedkategori.name}
                onCancel={() => setEditingName(false)}
                onSave={handleUpdateHovedkategori}
              />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {hovedkategori.icon && (
                    <span className="text-2xl">{hovedkategori.icon}</span>
                  )}
                  <h3 className="text-xl font-semibold">
                    {hovedkategori.name}
                    {hovedkategori.isIncome && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        System
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Add subcategory button (only if allowed) */}
                  {hovedkategori.allowSubcategories !== false && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowNewSubcategory(true)}
                        title="Legg til én underkategori"
                      >
                        <span className="text-lg">+</span>
                      </Button>
                      
                      {/* Bulk add button */}
                      <button
                        onClick={() => setShowBulkAdd(!showBulkAdd)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                        title="Legg til flere underkategorier samtidig"
                      >
                        <span className="text-base">📝</span>
                        <span className="hidden sm:inline">Legg til flere</span>
                      </button>
                    </>
                  )}

                  {/* Edit button (not for income category) */}
                  {!hovedkategori.isIncome && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                      title="Endre navn"
                    >
                      <span className="text-base">✏️</span>
                    </Button>
                  )}

                  {/* Delete button (not for income category) */}
                  {!hovedkategori.isIncome && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowDeleteDialog(true)}
                      title="Slett kategori"
                    >
                      <span className="text-base">🗑️</span>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Bulk add subcategories */}
          {showBulkAdd && (
            <div className="mb-4">
              <BulkAddSubcategories
                hovedkategoriId={hovedkategori.id}
                existingSubcategories={underkategorier}
                onCancel={() => setShowBulkAdd(false)}
                onSave={handleBulkAddSubcategories}
              />
            </div>
          )}

          {/* New subcategory input */}
          {showNewSubcategory && !showBulkAdd && (
            <div className="mb-4">
              <NewSubcategoryInput
                hovedkategoriId={hovedkategori.id}
                onCancel={() => setShowNewSubcategory(false)}
                onSave={handleAddSubcategory}
              />
            </div>
          )}

          {/* Underkategorier list */}
          {underkategorier.length > 0 ? (
            <div className="space-y-2">
              {underkategorier.map((underkategori) => (
                <div
                  key={underkategori.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {editingSubcategoryId === underkategori.id ? (
                    <EditCategoryName
                      currentName={underkategori.name}
                      onCancel={() => setEditingSubcategoryId(null)}
                      onSave={(name) => handleUpdateUnderkategori(underkategori.id, name)}
                    />
                  ) : (
                    <>
                      <span className="text-sm font-medium flex items-center gap-2">
                        <span className="text-gray-400">└─</span>
                        {underkategori.name}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingSubcategoryId(underkategori.id)}
                          className="h-8 w-8"
                          title="Endre navn"
                        >
                          <span className="text-sm">✏️</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingSubcategoryId(underkategori.id)}
                          className="h-8 w-8"
                          title="Slett underkategori"
                        >
                          <span className="text-sm">🗑️</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showNewSubcategory && (
              <p className="text-sm text-gray-500 italic">
                Ingen underkategorier. Klikk + for å legge til.
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Delete hovedkategori dialog */}
      <DeleteCategoryDialog
        open={showDeleteDialog}
        categoryName={hovedkategori.name}
        transactionCount={transactionCount}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteHovedkategori}
      />

      {/* Delete underkategori dialog */}
      {deletingSubcategory && (
        <DeleteCategoryDialog
          open={!!deletingSubcategoryId}
          categoryName={deletingSubcategory.name}
          transactionCount={deletingSubcategoryTransactionCount}
          onCancel={() => setDeletingSubcategoryId(null)}
          onConfirm={() => handleDeleteUnderkategori(deletingSubcategory.id)}
        />
      )}
    </>
  );
};

// ============================================================================
// Main Category Page Component
// ============================================================================

interface CategoryPageProps {
  onNavigate?: (page: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('kategorier');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Store state and actions
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore((state) => state.createHovedkategori);
  const getHovedkategoriWithUnderkategorier = useTransactionStore(
    (state) => state.getHovedkategoriWithUnderkategorier
  );

  const handleCreateHovedkategori = () => {
    if (newCategoryName.trim()) {
      createHovedkategori(newCategoryName.trim(), {
        color: '#3b82f6',
        icon: '📁',
      });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateHovedkategori();
    } else if (e.key === 'Escape') {
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kategorier</h1>
            <p className="text-gray-600 mt-2">
              Administrer hovedkategorier og underkategorier for transaksjoner.
            </p>
          </div>

          {/* Add New Category Button */}
          <div className="mb-6">
            {showNewCategoryInput ? (
              <div className="flex items-center gap-2 p-4 bg-white rounded-lg border border-gray-200">
                <Input
                  type="text"
                  placeholder="Navn på ny hovedkategori..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  onClick={handleCreateHovedkategori}
                  disabled={!newCategoryName.trim()}
                >
                  Lagre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryName('');
                  }}
                >
                  Avbryt
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowNewCategoryInput(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                + Ny hovedkategori
              </Button>
            )}
          </div>

          {/* Category Cards */}
          <div className="space-y-6">
            {hovedkategorier
              .filter((hk) => !hk.hideFromCategoryPage)
              .map((hovedkategori) => {
                const details = getHovedkategoriWithUnderkategorier(hovedkategori.id);
                const underkategorier = details?.underkategorier || [];

                return (
                  <CategoryCard
                    key={hovedkategori.id}
                    hovedkategori={hovedkategori}
                    underkategorier={underkategorier}
                  />
                );
              })}

            {hovedkategorier.filter((hk) => !hk.hideFromCategoryPage).length === 1 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Ingen egendefinerte kategorier ennå</p>
                <p className="text-sm">
                  Klikk "Ny hovedkategori" for å komme i gang
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;

