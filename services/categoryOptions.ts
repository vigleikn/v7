import type { Hovedkategori, Underkategori } from '../src/store/state';
import type { CategoryOption } from '../components/CategoryCombobox';

export const cleanCategoryNameForSort = (name: string): string => {
  return name.replace(/^[^\p{L}]*/u, '');
};

export function buildAssignableCategoryOptions(
  hovedkategorier: Hovedkategori[],
  getHovedkategoriWithUnderkategorier: (id: string) => {
    hovedkategori: Hovedkategori;
    underkategorier: Underkategori[];
  } | null
): CategoryOption[] {
  const categories: CategoryOption[] = [];

  hovedkategorier.forEach((hk) => {
    const details = getHovedkategoriWithUnderkategorier(hk.id);
    const hasSubcategories = details?.underkategorier && details.underkategorier.length > 0;

    if (!hasSubcategories) {
      categories.push({ id: hk.id, name: hk.name, icon: hk.icon });
    }

    details?.underkategorier.forEach((uk) => {
      categories.push({ id: uk.id, name: uk.name, icon: uk.icon });
    });
  });

  return categories.sort((a, b) =>
    cleanCategoryNameForSort(a.name).localeCompare(cleanCategoryNameForSort(b.name), 'nb')
  );
}

export function buildAllCategoryOptions(
  hovedkategorier: Hovedkategori[],
  underkategorier: Underkategori[]
): CategoryOption[] {
  const categories: CategoryOption[] = [];

  hovedkategorier.forEach((hk) => {
    categories.push({ id: hk.id, name: hk.name, icon: hk.icon });
    hk.underkategorier?.forEach((ukId) => {
      const uk = underkategorier.find((item) => item.id === ukId);
      if (uk) {
        categories.push({ id: uk.id, name: uk.name, icon: uk.icon });
      }
    });
  });

  return categories.sort((a, b) => a.name.localeCompare(b.name, 'no'));
}
