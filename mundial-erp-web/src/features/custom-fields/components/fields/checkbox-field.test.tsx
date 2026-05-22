import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckboxField } from './checkbox-field';
import { makeCustomFieldDefinition } from '../../types/custom-field.fixtures';

describe('CheckboxField', () => {
  it('renderiza unchecked quando value=null', () => {
    const def = makeCustomFieldDefinition({ type: 'CHECKBOX', name: 'Ativo' });
    render(<CheckboxField definition={def} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('emite true ao marcar', () => {
    const onChange = vi.fn();
    const def = makeCustomFieldDefinition({ type: 'CHECKBOX' });
    render(
      <CheckboxField definition={def} value={false} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
