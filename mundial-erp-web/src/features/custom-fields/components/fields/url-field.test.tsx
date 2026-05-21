/**
 * Sprint 2 (TTT-024) — Vitest UrlField.
 * Owner: Tatiana Brandao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UrlField } from './url-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';
import { makeCustomFieldDefinition } from "../../types/custom-field.fixtures";

const definition: CustomFieldDefinition = makeCustomFieldDefinition({ id: 'def-url-1', workspaceId: 'ws-1', name: 'Website', type: 'URL' });

describe('UrlField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input type=url', () => {
    const onChange = vi.fn();
    render(
      <UrlField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      'https://exemplo.com',
    ) as HTMLInputElement;
    expect(input.type).toBe('url');
  });

  it('debouncea onChange', () => {
    const onChange = vi.fn();
    render(
      <UrlField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('https://exemplo.com');
    fireEvent.change(input, { target: { value: 'https://mundial.example.com' } });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledWith('https://mundial.example.com');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <UrlField
        definition={definition}
        value={null}
        onChange={onChange}
        error="URL invalida"
      />,
    );
    const input = screen.getByPlaceholderText('https://exemplo.com');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('URL invalida');
  });
});
