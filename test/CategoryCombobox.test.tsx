import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryCombobox } from '../components/CategoryCombobox';

const options = [
  { id: 'groceries', name: 'Dagligvarer' },
  { id: 'electronics', name: 'Elektronikk' },
  { id: 'income', name: 'Andre inntekter', icon: '💰' },
];

describe('CategoryCombobox', () => {
  it('filters categories while typing and selects the matching category', () => {
    const onChange = vi.fn();
    render(
      <CategoryCombobox
        value=""
        onChange={onChange}
        options={options}
        placeholder="Velg kategori..."
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'elek' } });

    expect(screen.getByText('Elektronikk')).toBeInTheDocument();
    expect(screen.queryByText('Dagligvarer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Elektronikk'));

    expect(onChange).toHaveBeenCalledWith('electronics');
  });

  it('keeps the uncategorized option searchable when provided', () => {
    const onChange = vi.fn();
    render(
      <CategoryCombobox
        value=""
        onChange={onChange}
        options={options}
        includeUncategorized
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'uk' } });
    fireEvent.click(screen.getByText('Ukategorisert'));

    expect(onChange).toHaveBeenCalledWith('__uncategorized');
  });

  it('supports keyboard selection with Enter', () => {
    const onChange = vi.fn();
    render(
      <CategoryCombobox
        value=""
        onChange={onChange}
        options={options}
        placeholder="Velg kategori..."
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dag' } });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('groceries');
  });

  it('uses right-click as a separate category action without normal selection', () => {
    const onChange = vi.fn();
    const onCategoryContextMenu = vi.fn();
    render(
      <CategoryCombobox
        value=""
        onChange={onChange}
        options={options}
        placeholder="Velg kategori..."
        onCategoryContextMenu={onCategoryContextMenu}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.contextMenu(screen.getByText('Dagligvarer'));

    expect(onCategoryContextMenu).toHaveBeenCalledWith('groceries');
    expect(onChange).not.toHaveBeenCalled();
  });
});
