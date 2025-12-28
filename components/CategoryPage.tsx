/**
 * Category Management Page
 * Complete admin interface for managing hovedkategorier and underkategorier
 */

import React, { useState } from 'react';
import { useTransactionStore, selectHovedkategorier } from '../src/store';
import { Hovedkategori, Underkategori } from '../src/store';
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
  draggedUnderkategori: { id: string; currentHovedkategoriId: string } | null;
  onDragStart: (underkategoriId: string, hovedkategoriId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetHovedkategoriId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  hovedkategori,
  underkategorier,
  draggedUnderkategori,
  onDragStart,
  onDragEnd,
  onDrop,
}) => {
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Drag and drop handlers
  const isValidDropTarget = 
    draggedUnderkategori !== null && 
    draggedUnderkategori.currentHovedkategoriId !== hovedkategori.id &&
    hovedkategori.allowSubcategories !== false;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show drag-over if this is a valid drop target
    if (isValidDropTarget) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropOnCard = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (isValidDropTarget) {
      onDrop(hovedkategori.id);
    }
  };

  return (
    <>
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnCard}
        className={`flex flex-col break-inside-avoid mb-6 overflow-hidden ${isDragOver && isValidDropTarget ? 'ring-4 ring-blue-400 bg-blue-50' : ''}`}
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        <CardHeader className="pb-4">
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
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {hovedkategori.icon && hovedkategori.icon !== '📁' && (
                    <span className="text-xl flex-shrink-0">{hovedkategori.icon}</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {hovedkategori.name}
                    {hovedkategori.isIncome && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                        System
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
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
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors px-1.5 py-1 rounded hover:bg-blue-50"
                        title="Legg til flere underkategorier samtidig"
                      >
                        <span className="text-sm">📝</span>
                        <span className="hidden md:inline">Legg til flere</span>
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

        <CardContent className="pt-0 pb-6">
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
            <div className="space-y-1.5">
              {underkategorier.map((underkategori) => {
                const isDragging = draggedUnderkategori?.id === underkategori.id;
                
                return (
                  <div
                    key={underkategori.id}
                    draggable={editingSubcategoryId !== underkategori.id}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      onDragStart(underkategori.id, hovedkategori.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      onDragEnd();
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-md transition-all duration-150 ${
                      isDragging 
                        ? 'opacity-50 bg-blue-100 cursor-grabbing scale-105 shadow-md' 
                        : 'bg-gray-50 hover:bg-gray-200 cursor-grab hover:shadow-sm'
                    }`}
                  >
                    {editingSubcategoryId === underkategori.id ? (
                      <EditCategoryName
                        currentName={underkategori.name}
                        onCancel={() => setEditingSubcategoryId(null)}
                        onSave={(name) => handleUpdateUnderkategori(underkategori.id, name)}
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">⋮⋮</span>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {underkategori.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingSubcategoryId(underkategori.id)}
                            className="h-7 w-7"
                            title="Endre navn"
                          >
                            <span className="text-sm">✏️</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingSubcategoryId(underkategori.id)}
                            className="h-7 w-7"
                            title="Slett underkategori"
                          >
                            <span className="text-sm">🗑️</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
  const [draggedUnderkategori, setDraggedUnderkategori] = useState<{
    id: string;
    currentHovedkategoriId: string;
  } | null>(null);
  
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Store state and actions
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore((state) => state.createHovedkategori);
  const moveUnderkategori = useTransactionStore((state) => state.moveUnderkategori);
  const getHovedkategoriWithUnderkategorier = useTransactionStore(
    (state) => state.getHovedkategoriWithUnderkategorier
  );

  const handleCreateHovedkategori = () => {
    if (newCategoryName.trim()) {
      createHovedkategori(newCategoryName.trim(), {
        color: '#3b82f6',
        icon: '',
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

  // Drag and drop handlers
  const handleDragStart = (underkategoriId: string, currentHovedkategoriId: string) => {
    setDraggedUnderkategori({ id: underkategoriId, currentHovedkategoriId });
  };

  const handleDragEnd = () => {
    setDraggedUnderkategori(null);
  };

  const handleDrop = (targetHovedkategoriId: string) => {
    if (draggedUnderkategori) {
      console.log(`🔀 Moving underkategori ${draggedUnderkategori.id} to hovedkategori ${targetHovedkategoriId}`);
      moveUnderkategori(draggedUnderkategori.id, targetHovedkategoriId);
      setDraggedUnderkategori(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kategorier</h1>
            <p className="text-gray-600 mt-2">
              Administrer hovedkategorier og underkategorier for transaksjoner.
            </p>
            <p className="text-sm text-blue-600 mt-1">
              💡 Dra og slipp underkategorier mellom hovedkategorier for å flytte dem
            </p>
          </div>

          {/* Drag-in-progress indicator */}
          {draggedUnderkategori && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                ✋ Drar underkategori... Slipp på en annen hovedkategori for å flytte
              </p>
            </div>
          )}

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
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
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
                    draggedUnderkategori={draggedUnderkategori}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
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

