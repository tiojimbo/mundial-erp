import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RatingField } from './rating-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('RatingField', () => {
  it('renderiza 5 estrelas por default', () => {
    const def = makeCustomFieldDefinition({ type: 'RATING', name: 'Nota' });
    render(<RatingField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('respeita maxStars do config', () => {
    const def = makeCustomFieldDefinition({
      type: 'RATING',
      config: { maxStars: 10 },
    });
    render(<RatingField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(10);
  });

  it('clicar estrela emite o numero', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'RATING' });
    render(<RatingField definition={def} value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3 de 5' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
