import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RollupField } from './rollup-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('RollupField', () => {
  it('mostra travessao quando value null', () => {
    const def = makeCustomFieldDefinition({ type: 'ROLLUP', name: 'Total' });
    render(<RollupField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formata number com locale pt-BR', () => {
    const def = makeCustomFieldDefinition({ type: 'ROLLUP' });
    render(<RollupField definition={def} value={1234.5} onChange={vi.fn()} />);
    expect(screen.getByText(/1\.234,5/)).toBeInTheDocument();
  });
});
