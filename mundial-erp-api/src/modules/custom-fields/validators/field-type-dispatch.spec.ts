/**
 * Unit tests — `validateRequiredWhen` (PLANO-TASK-TYPES-TEMPLATES Sprint,
 * Regra de Negocio #4 / AC TTT-012).
 *
 * Foco: validacao server-side da `config.requiredWhen.{field, equals}`.
 * Pre-condicao: outros custom fields da mesma task ja estao no `Map<key, value>`.
 *
 * Autoria: Beatriz Camargo (Backend Content) — fix P1 do laudo CTO TTT.
 */
import {
  DefinitionRequiredWhenShape,
  validateRequiredWhen,
} from './field-type-dispatch';

describe('validateRequiredWhen', () => {
  const linkedOrderDef: DefinitionRequiredWhenShape = {
    label: 'N° do pedido vinculado',
    config: {
      hint: 'Obrigatorio se tipo = Venda',
      requiredWhen: { field: 'type', equals: 'VENDA' },
    },
  };

  const noRequiredWhenDef: DefinitionRequiredWhenShape = {
    label: 'Cliente vinculado',
    config: { hint: 'opcional' },
  };

  const nullConfigDef: DefinitionRequiredWhenShape = {
    label: 'Sem config',
    config: null,
  };

  it('definition sem `requiredWhen` -> ok com qualquer valor (incluindo vazio)', () => {
    expect(
      validateRequiredWhen(noRequiredWhenDef, '', new Map()).ok,
    ).toBe(true);
    expect(
      validateRequiredWhen(noRequiredWhenDef, null, new Map()).ok,
    ).toBe(true);
    expect(
      validateRequiredWhen(noRequiredWhenDef, undefined, new Map()).ok,
    ).toBe(true);
    expect(
      validateRequiredWhen(noRequiredWhenDef, 'qualquer', new Map()).ok,
    ).toBe(true);
  });

  it('definition com `config = null` -> ok sempre', () => {
    expect(validateRequiredWhen(nullConfigDef, '', new Map()).ok).toBe(true);
    expect(validateRequiredWhen(nullConfigDef, null, new Map()).ok).toBe(true);
  });

  it('`requiredWhen` presente mas trigger NAO satisfeito -> ok mesmo com valor vazio', () => {
    const others = new Map<string, unknown>([['type', 'INTERNO']]);

    expect(validateRequiredWhen(linkedOrderDef, '', others).ok).toBe(true);
    expect(validateRequiredWhen(linkedOrderDef, null, others).ok).toBe(true);
    expect(validateRequiredWhen(linkedOrderDef, undefined, others).ok).toBe(
      true,
    );
  });

  it('`requiredWhen` presente, trigger AUSENTE no map -> ok com valor vazio', () => {
    // Sem `type` definido na task, a condicao nao se aplica.
    const others = new Map<string, unknown>();
    expect(validateRequiredWhen(linkedOrderDef, '', others).ok).toBe(true);
  });

  it('`requiredWhen` satisfeito + valor VAZIO (string vazia) -> reject com mensagem', () => {
    const others = new Map<string, unknown>([['type', 'VENDA']]);
    const result = validateRequiredWhen(linkedOrderDef, '', others);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('N° do pedido vinculado');
    expect(result.reason).toContain('type');
    expect(result.reason).toContain('VENDA');
  });

  it('`requiredWhen` satisfeito + valor `null` -> reject', () => {
    const others = new Map<string, unknown>([['type', 'VENDA']]);
    const result = validateRequiredWhen(linkedOrderDef, null, others);

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('`requiredWhen` satisfeito + valor `undefined` -> reject', () => {
    const others = new Map<string, unknown>([['type', 'VENDA']]);
    const result = validateRequiredWhen(linkedOrderDef, undefined, others);

    expect(result.ok).toBe(false);
  });

  it('`requiredWhen` satisfeito + valor PREENCHIDO -> ok', () => {
    const others = new Map<string, unknown>([['type', 'VENDA']]);
    const result = validateRequiredWhen(
      linkedOrderDef,
      'ORD-12345',
      others,
    );

    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('regra com `equals` mas trigger e numero (typing strict): nao casa por igualdade ===', () => {
    // Reforco anti-coercion: `equals: '10'` (string) nao deve casar com 10 (number).
    const def: DefinitionRequiredWhenShape = {
      label: 'Numerico',
      config: { requiredWhen: { field: 'count', equals: '10' } },
    };
    const others = new Map<string, unknown>([['count', 10]]);
    expect(validateRequiredWhen(def, '', others).ok).toBe(true);
  });

  it('regra `requiredWhen` malformada (sem `field` ou `equals`) -> ignora regra (ok)', () => {
    const malformedFieldOnly: DefinitionRequiredWhenShape = {
      label: 'Mal',
      config: { requiredWhen: { field: 'type' } },
    };
    const malformedEmpty: DefinitionRequiredWhenShape = {
      label: 'Mal',
      config: { requiredWhen: {} },
    };
    const malformedString: DefinitionRequiredWhenShape = {
      label: 'Mal',
      config: { requiredWhen: 'invalido' },
    };

    const others = new Map<string, unknown>([['type', 'VENDA']]);
    expect(validateRequiredWhen(malformedFieldOnly, '', others).ok).toBe(true);
    expect(validateRequiredWhen(malformedEmpty, '', others).ok).toBe(true);
    expect(validateRequiredWhen(malformedString, '', others).ok).toBe(true);
  });
});
