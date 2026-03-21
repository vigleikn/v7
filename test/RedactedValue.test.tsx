import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RedactedValue } from '../components/RedactedValue';

describe('RedactedValue', () => {
  it('renders the value normally when isRedacted is false', () => {
    render(<RedactedValue value="12 345" isRedacted={false} />);
    const el = screen.getByText('12 345');
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveClass('select-none');
  });

  it('renders a redacted block when isRedacted is true', () => {
    render(<RedactedValue value="12 345" isRedacted={true} />);
    const el = screen.getByText('12 345');
    expect(el).toBeInTheDocument();
    // The element should have redaction styling (invisible text)
    expect(el).toHaveClass('select-none');
    expect(el.style.color).toBe('transparent');
  });

  it('preserves className when not redacted', () => {
    render(<RedactedValue value="500" isRedacted={false} className="text-green-600" />);
    const el = screen.getByText('500');
    expect(el).toHaveClass('text-green-600');
  });

  it('replaces text color class when redacted', () => {
    render(<RedactedValue value="500" isRedacted={true} className="text-green-600" />);
    const el = screen.getByText('500');
    // Should have redaction background
    expect(el).toHaveClass('select-none');
    expect(el.style.color).toBe('transparent');
  });

  it('renders React node children', () => {
    render(<RedactedValue value={<strong>bold</strong>} isRedacted={false} />);
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('does not alter the DOM value even when redacted (non-destructive)', () => {
    render(<RedactedValue value="secret" isRedacted={true} />);
    // The actual text content is still in the DOM (just invisible)
    const el = screen.getByText('secret');
    expect(el.textContent).toBe('secret');
  });
});
