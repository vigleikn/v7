/**
 * Rules Management Page
 * View and manage category rules grouped by category
 */

import React, { useMemo, useState } from 'react';
import { useTransactionStore } from '../src/store';
import { CategoryRule } from '../categoryEngine';
import { Sidebar } from './Sidebar';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
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

interface RulesPageProps {
  onNavigate?: (page: string) => void;
}

interface GroupedRules {
  [categoryId: string]: {
    categoryName: string;
    categoryIcon?: string;
    rules: CategoryRule[];
  };
}


export const RulesPage: React.FC<RulesPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('regler');
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');

  const rules = useTransactionStore((state) => Array.from(state.rules.values()));
  const hovedkategorier = useTransactionStore((state) =>
    Array.from(state.hovedkategorier.values())
  );
  const underkategorier = useTransactionStore((state) =>
    Array.from(state.underkategorier.values())
  );
  const deleteRuleAction = useTransactionStore((state) => state.deleteRuleAction);
  const createRule = useTransactionStore((state) => state.createRule);

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Create a map of all categories for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string }>();
    hovedkategorier.forEach((hk) => {
      map.set(hk.id, { name: hk.name, icon: hk.icon });
    });
    underkategorier.forEach((uk) => {
      map.set(uk.id, { name: uk.name });
    });
    return map;
  }, [hovedkategorier, underkategorier]);

  // Group rules by category
  const groupedRules = useMemo(() => {
    const grouped: GroupedRules = {};
    
    rules.forEach((rule) => {
      const category = categoryMap.get(rule.categoryId);
      if (!category) return;
      
      if (!grouped[rule.categoryId]) {
        grouped[rule.categoryId] = {
          categoryName: category.name,
          categoryIcon: category.icon,
          rules: [],
        };
      }
      grouped[rule.categoryId].rules.push(rule);
    });

    // Sort rules within each category alphabetically
    Object.keys(grouped).forEach((categoryId) => {
      grouped[categoryId].rules.sort((a, b) => 
        a.tekst.localeCompare(b.tekst, 'no')
      );
    });

    return grouped;
  }, [rules, categoryMap]);

  // Get all categories for dropdown (sorted)
  const allCategories = useMemo(() => {
    const categories: Array<{ id: string; name: string; icon?: string }> = [];
    
    hovedkategorier.forEach((hk) => {
      categories.push({ id: hk.id, name: hk.name, icon: hk.icon });
      hk.underkategorier?.forEach((ukId) => {
        const uk = underkategorier.find((u) => u.id === ukId);
        if (uk) {
          categories.push({ id: uk.id, name: uk.name });
        }
      });
    });

    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name, 'no'));
    return categories;
  }, [hovedkategorier, underkategorier]);

  const handleDeleteClick = (tekst: string) => {
    setDeletingRule(tekst);
  };

  const handleDeleteConfirm = () => {
    if (deletingRule) {
      deleteRuleAction(deletingRule);
      setDeletingRule(null);
    }
  };

  const handleEditClick = (rule: CategoryRule) => {
    setEditingRule(rule.tekst);
    setEditingCategoryId(rule.categoryId);
  };

  const handleEditSave = () => {
    if (editingRule && editingCategoryId) {
      // Use createRule to update (it handles both create and update)
      createRule(editingRule, editingCategoryId);
      setEditingRule(null);
      setEditingCategoryId('');
    }
  };

  const handleEditCancel = () => {
    setEditingRule(null);
    setEditingCategoryId('');
  };

  // Sort category groups by name
  const sortedCategoryIds = Object.keys(groupedRules).sort((a, b) => {
    const nameA = groupedRules[a].categoryName;
    const nameB = groupedRules[b].categoryName;
    return nameA.localeCompare(nameB, 'no');
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Regler</h1>
            <p className="text-gray-600 mt-2">
              Oversikt over alle kategoriregler. Regler matcher transaksjoner basert på tekst-feltet.
            </p>
          </div>

          {/* Rules grouped by category */}
          {sortedCategoryIds.length > 0 ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
              {sortedCategoryIds.map((categoryId) => {
                const group = groupedRules[categoryId];
                return (
                  <Card
                    key={categoryId}
                    className="flex flex-col break-inside-avoid mb-6 overflow-hidden"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        {group.categoryIcon && group.categoryIcon !== '📁' && (
                          <span className="text-2xl">{group.categoryIcon}</span>
                        )}
                        <h2 className="text-xl font-semibold">{group.categoryName}</h2>
                        <span className="text-sm text-gray-500">
                          ({group.rules.length} regel{group.rules.length !== 1 ? 'er' : ''})
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-6">
                      <div className="space-y-1.5">
                        {group.rules.map((rule) => (
                          <div
                            key={rule.tekst}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {rule.tekst}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(rule)}
                                className="h-7 w-7"
                                title="Endre kategori"
                              >
                                <span className="text-sm">✏️</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(rule.tekst)}
                                className="h-7 w-7"
                                title="Slett regel"
                              >
                                <span className="text-sm">🗑️</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  Ingen regler opprettet ennå. Regler opprettes automatisk når du kategoriserer transaksjoner.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Delete confirmation dialog */}
          <AlertDialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slett regel?</AlertDialogTitle>
                <AlertDialogDescription>
                  Er du sikker på at du vil slette regelen "{deletingRule}"?
                  <span className="block mt-2">
                    Transaksjoner som matcher denne regelen vil ikke lenger bli automatisk kategorisert.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingRule(null)}>
                  Avbryt
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Slett regel
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit rule dialog */}
          <AlertDialog open={!!editingRule} onOpenChange={(open) => !open && handleEditCancel()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Endre regel</AlertDialogTitle>
                <AlertDialogDescription>
                  Velg ny kategori for regelen "{editingRule}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Kategori
                </label>
                <select
                  value={editingCategoryId}
                  onChange={(e) => setEditingCategoryId(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Velg kategori</option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon && cat.icon !== '📁' ? `${cat.icon} ${cat.name}` : cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleEditCancel}>
                  Avbryt
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEditSave}
                  disabled={!editingCategoryId}
                >
                  Lagre
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;

