import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: CategoryOption[];
  placeholder?: string;
  includeUncategorized?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
  onCategoryContextMenu?: (categoryId: string) => void;
}

const cleanForSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/^[^\p{L}\p{N}]*/u, '')
    .trim();

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Velg kategori...',
  includeUncategorized = false,
  includeAllOption = false,
  allOptionLabel = 'Alle kategorier',
  disabled = false,
  className = '',
  onCategoryContextMenu,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(() => {
    const result: CategoryOption[] = [];
    if (includeAllOption) {
      result.push({ id: '', name: allOptionLabel });
    }
    if (includeUncategorized) {
      result.push({ id: '__uncategorized', name: 'Ukategorisert' });
    }
    return [...result, ...options];
  }, [allOptionLabel, includeAllOption, includeUncategorized, options]);

  const selectedOption = allOptions.find((option) => option.id === value);
  const displayValue = isOpen ? query : selectedOption?.name ?? '';

  const filteredOptions = useMemo(() => {
    const normalizedQuery = cleanForSearch(query);
    if (!normalizedQuery) return allOptions;

    return allOptions.filter((option) => {
      const label = `${option.icon ?? ''} ${option.name}`;
      return cleanForSearch(label).includes(normalizedQuery);
    });
  }, [allOptions, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectOption = (option: CategoryOption) => {
    onChange(option.id);
    setIsOpen(false);
    setQuery('');
  };

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      return;
    }

    if (event.key === 'Enter' && filteredOptions[0]) {
      event.preventDefault();
      selectOption(filteredOptions[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} data-prevent-copy>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onFocus={open}
        onClick={open}
        onChange={(event) => {
          setIsOpen(true);
          setQuery(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id || '__all'}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                onContextMenu={(event) => {
                  if (!onCategoryContextMenu || !option.id || option.id === '__uncategorized') {
                    return;
                  }
                  event.preventDefault();
                  onCategoryContextMenu(option.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                  option.id === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                }`}
              >
                {option.icon && option.icon !== '📁' ? <span>{option.icon}</span> : null}
                <span>{option.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Ingen treff</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryCombobox;
