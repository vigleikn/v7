/**
 * Rules Management Page
 * View and manage category rules grouped by category
 */

import React, { useMemo, useState } from 'react';
import { useTransactionStore } from '../src/store';
import { CategoryRule } from '../categoryEngine';
import { Sidebar } from './Sidebar';
import { CategoryCombobox } from './CategoryCombobox';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { buildAllCategoryOptions } from '../services/categoryOptions';
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
  const [deletingRuleKey, setDeletingRuleKey] = useState<string | null>(null);
  const [deletingRuleLabel, setDeletingRuleLabel] = useState<string>('');
  const [editingRuleKey, setEditingRuleKey] = useState<string | null>(null);
  const [editingRuleLabel, setEditingRuleLabel] = useState<string>('');
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');

  const rules = useTransactionStore((state) => Array.from(state.rules.values()));
  const hovedkategorier = useTransactionStore((state) =>
    Array.from(state.hovedkategorier.values())
  );
  const underkategorier = useTransactionStore((state) =>
    Array.from(state.underkategorier.values())
  );
  const deleteRuleAction = useTransactionStore((state) => state.deleteRuleAction);
  const updateRuleCategory = useTransactionStore((state) => state.updateRuleCategory);

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

  const allCategories = useMemo(() => {
    return buildAllCategoryOptions(hovedkategorier, underkategorier);
  }, [hovedkategorier, underkategorier]);

  const ruleDisplayLabel = (rule: CategoryRule): string => {
    if (rule.fraKontonummer && rule.tilKontonummer) {
      return `${rule.tekst} (fra ${rule.fraKontonummer} → til ${rule.tilKontonummer})`;
    }
    return rule.tekst;
  };

  const handleDeleteClick = (rule: CategoryRule) => {
    setDeletingRuleKey(rule.ruleKey);
    setDeletingRuleLabel(ruleDisplayLabel(rule));
  };

  const handleDeleteConfirm = () => {
    if (deletingRuleKey) {
      deleteRuleAction(deletingRuleKey);
      setDeletingRuleKey(null);
      setDeletingRuleLabel('');
    }
  };

  const handleEditClick = (rule: CategoryRule) => {
    setEditingRuleKey(rule.ruleKey);
    setEditingRuleLabel(ruleDisplayLabel(rule));
    setEditingCategoryId(rule.categoryId);
  };

  const handleEditSave = () => {
    if (editingRuleKey && editingCategoryId) {
      updateRuleCategory(editingRuleKey, editingCategoryId);
      setEditingRuleKey(null);
      setEditingRuleLabel('');
      setEditingCategoryId('');
    }
  };

  const handleEditCancel = () => {
    setEditingRuleKey(null);
    setEditingRuleLabel('');
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
              Regler matcher først på tekst og fra/til-kontonummer når begge finnes; ellers på tekst
              som før (globale regler).
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
                            key={rule.ruleKey}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {rule.tekst}
                              </div>
                              {rule.fraKontonummer && rule.tilKontonummer ? (
                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                  Fra {rule.fraKontonummer} → til {rule.tilKontonummer}
                                </div>
                              ) : null}
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
                                onClick={() => handleDeleteClick(rule)}
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
          <AlertDialog
            open={!!deletingRuleKey}
            onOpenChange={(open) => {
              if (!open) {
                setDeletingRuleKey(null);
                setDeletingRuleLabel('');
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slett regel?</AlertDialogTitle>
                <AlertDialogDescription>
                  Er du sikker på at du vil slette regelen «{deletingRuleLabel}»?
                  <span className="block mt-2">
                    Transaksjoner som matcher denne regelen vil ikke lenger bli automatisk kategorisert.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setDeletingRuleKey(null);
                    setDeletingRuleLabel('');
                  }}
                >
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
          <AlertDialog open={!!editingRuleKey} onOpenChange={(open) => !open && handleEditCancel()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Endre regel</AlertDialogTitle>
                <AlertDialogDescription>
                  Velg ny kategori for regelen «{editingRuleLabel}».
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Kategori
                </label>
                <CategoryCombobox
                  value={editingCategoryId}
                  onChange={setEditingCategoryId}
                  options={allCategories}
                  placeholder="Velg kategori"
                />
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

