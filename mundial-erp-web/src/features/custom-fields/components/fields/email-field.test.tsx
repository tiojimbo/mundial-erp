/**
 * Sprint 2 (TTT-024) — Vitest EmailField.
 * Owner: Tatiana Brandao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EmailField } from './email-field';
import type { CustomFieldDefinition } from '../../types/custom-field.types';

const definition: CustomFieldDefinition = {
  id: 'def-email-1',
  workspaceId: 'ws-1',
  key: 'contact_email',
  label: 'Email de contato',
  type: 'EMAIL',
  required: false,
  config: null,
  isBuiltin: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('EmailField (TTT-024)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza input type=email', () => {
    const onChange = vi.fn();
    render(
      <EmailField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText(
      'nome@exemplo.com',
    ) as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('debouncea onChange em 500ms', () => {
    const onChange = vi.fn();
    render(
      <EmailField definition={definition} value={null} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText('nome@exemplo.com');
    fireEvent.change(input, { target: { value: 'tatiana@mundial.com' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('tatiana@mundial.com');
  });

  it('aria-invalid=true e mensagem visivel em erro', () => {
    const onChange = vi.fn();
    render(
      <EmailField
        definition={definition}
        value={null}
        onChange={onChange}
        error="Email invalido"
      />,
    );
    const input = screen.getByPlaceholderText('nome@exemplo.com');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent('Email invalido');
  });
});
