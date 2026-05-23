/**
 * Unit tests — `validateRequiredWhen` (PLANO-TASK-TYPES-TEMPLATES Sprint,
 * Regra de Negocio #4 / AC TTT-012).
 *
 * Foco: validacao server-side da `config.requiredWhen.{field, equals}`.
 * Pre-condicao: outros custom fields da mesma task ja estao no `Map<key, value>`.
 *
 * Autoria: Beatriz Camargo (Backend Content) — fix P1 do laudo CTO TTT.
 */
import { CustomFieldType } from '@prisma/client';
import {
  DefinitionRequiredWhenShape,
  DefinitionShape,
  validateRequiredWhen,
  validateValue,
} from './field-type-dispatch';

function def(
  type: CustomFieldType,
  overrides: Partial<DefinitionShape> = {},
): DefinitionShape {
  return {
    type,
    required: false,
    config: null,
    options: undefined,
    ...overrides,
  };
}

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
    expect(validateRequiredWhen(noRequiredWhenDef, '', new Map()).ok).toBe(
      true,
    );
    expect(validateRequiredWhen(noRequiredWhenDef, null, new Map()).ok).toBe(
      true,
    );
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
    const result = validateRequiredWhen(linkedOrderDef, 'ORD-12345', others);

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

describe('validateValue — tipos Hoppe (Sprint 2)', () => {
  const VALID_ID = 'clz1abcdef0001';
  const VALID_ID_2 = 'clz1abcdef0002';

  describe('SELECT', () => {
    it('aceita string presente em options[] (raiz)', () => {
      const result = validateValue(
        CustomFieldType.SELECT,
        'A',
        def(CustomFieldType.SELECT, { options: ['A', 'B', 'C'] }),
      );
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('A');
      expect(result.column).toBe('valueText');
    });

    it('rejeita valor fora das options', () => {
      const result = validateValue(
        CustomFieldType.SELECT,
        'Z',
        def(CustomFieldType.SELECT, { options: ['A', 'B'] }),
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('options');
    });
  });

  describe('LABEL', () => {
    it('aceita string presente em options[]', () => {
      const result = validateValue(
        CustomFieldType.LABEL,
        'urgente',
        def(CustomFieldType.LABEL, { options: ['urgente', 'normal'] }),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueText');
    });

    it('rejeita quando options ausente', () => {
      const result = validateValue(
        CustomFieldType.LABEL,
        'qualquer',
        def(CustomFieldType.LABEL),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('CHECKBOX', () => {
    it('aceita boolean', () => {
      const result = validateValue(
        CustomFieldType.CHECKBOX,
        true,
        def(CustomFieldType.CHECKBOX),
      );
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(true);
      expect(result.column).toBe('valueBoolean');
    });

    it('rejeita string "true"', () => {
      const result = validateValue(
        CustomFieldType.CHECKBOX,
        'true',
        def(CustomFieldType.CHECKBOX),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('PERCENTAGE', () => {
    it('aceita number dentro de [0,100]', () => {
      const result = validateValue(
        CustomFieldType.PERCENTAGE,
        45,
        def(CustomFieldType.PERCENTAGE),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueNumber');
    });

    it('rejeita number fora do intervalo padrao', () => {
      const result = validateValue(
        CustomFieldType.PERCENTAGE,
        150,
        def(CustomFieldType.PERCENTAGE),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('DURATION', () => {
    it('aceita number (ms)', () => {
      const result = validateValue(
        CustomFieldType.DURATION,
        3600000,
        def(CustomFieldType.DURATION),
      );
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(3600000);
      expect(result.column).toBe('valueNumber');
    });

    it('aceita {value, unit} e normaliza para ms', () => {
      const result = validateValue(
        CustomFieldType.DURATION,
        { value: 2, unit: 'h' },
        def(CustomFieldType.DURATION),
      );
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(7200000);
    });

    it('rejeita unit invalida', () => {
      const result = validateValue(
        CustomFieldType.DURATION,
        { value: 1, unit: 'lustro' },
        def(CustomFieldType.DURATION),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('RATING', () => {
    it('aceita inteiro dentro de [0, maxStars]', () => {
      const result = validateValue(
        CustomFieldType.RATING,
        4,
        def(CustomFieldType.RATING, { config: { maxStars: 5 } }),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueNumber');
    });

    it('rejeita decimal', () => {
      const result = validateValue(
        CustomFieldType.RATING,
        3.5,
        def(CustomFieldType.RATING),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('USER', () => {
    it('aceita id em formato cuid/uuid', () => {
      const result = validateValue(
        CustomFieldType.USER,
        VALID_ID,
        def(CustomFieldType.USER),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueText');
    });

    it('rejeita string curta', () => {
      const result = validateValue(
        CustomFieldType.USER,
        'x',
        def(CustomFieldType.USER),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('TEAM', () => {
    it('aceita id valido', () => {
      const result = validateValue(
        CustomFieldType.TEAM,
        VALID_ID,
        def(CustomFieldType.TEAM),
      );
      expect(result.valid).toBe(true);
    });

    it('rejeita number', () => {
      const result = validateValue(
        CustomFieldType.TEAM,
        123,
        def(CustomFieldType.TEAM),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('PEOPLE', () => {
    it('aceita array de ids unicos', () => {
      const result = validateValue(
        CustomFieldType.PEOPLE,
        [VALID_ID, VALID_ID_2],
        def(CustomFieldType.PEOPLE),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueJson');
      expect(result.normalized).toEqual([VALID_ID, VALID_ID_2]);
    });

    it('rejeita duplicatas', () => {
      const result = validateValue(
        CustomFieldType.PEOPLE,
        [VALID_ID, VALID_ID],
        def(CustomFieldType.PEOPLE),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('RELATIONSHIP', () => {
    it('aceita array de taskIds validos', () => {
      const result = validateValue(
        CustomFieldType.RELATIONSHIP,
        [VALID_ID, VALID_ID_2],
        def(CustomFieldType.RELATIONSHIP),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueJson');
    });

    it('rejeita item nao-string', () => {
      const result = validateValue(
        CustomFieldType.RELATIONSHIP,
        [VALID_ID, 42],
        def(CustomFieldType.RELATIONSHIP),
      );
      expect(result.valid).toBe(false);
    });

    describe('withQuantity', () => {
      const withQty = def(CustomFieldType.RELATIONSHIP, {
        config: { withQuantity: true },
      });

      it('aceita array de {taskId, quantity}', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [
            { taskId: VALID_ID, quantity: 10 },
            { taskId: VALID_ID_2, quantity: 0.5 },
          ],
          withQty,
        );
        expect(result.valid).toBe(true);
        expect(result.column).toBe('valueJson');
        expect(result.normalized).toEqual({
          items: [
            { taskId: VALID_ID, quantity: 10 },
            { taskId: VALID_ID_2, quantity: 0.5 },
          ],
          taskIds: [VALID_ID, VALID_ID_2],
        });
      });

      it('aceita lista vazia quando nao obrigatorio', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [],
          withQty,
        );
        expect(result.valid).toBe(true);
        expect(result.normalized).toEqual({ items: [], taskIds: [] });
      });

      it('rejeita lista vazia quando obrigatorio', () => {
        const required = def(CustomFieldType.RELATIONSHIP, {
          required: true,
          config: { withQuantity: true },
        });
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [],
          required,
        );
        expect(result.valid).toBe(false);
      });

      it('rejeita quantidade negativa', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [{ taskId: VALID_ID, quantity: -1 }],
          withQty,
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('quantity');
      });

      it('rejeita quantidade nao-numerica', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [{ taskId: VALID_ID, quantity: 'abc' }],
          withQty,
        );
        expect(result.valid).toBe(false);
      });

      it('rejeita taskIds duplicados', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [
            { taskId: VALID_ID, quantity: 1 },
            { taskId: VALID_ID, quantity: 2 },
          ],
          withQty,
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('duplicad');
      });

      it('rejeita item sem taskId', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [{ quantity: 5 }],
          withQty,
        );
        expect(result.valid).toBe(false);
      });

      it('rejeita item nao-objeto', () => {
        const result = validateValue(
          CustomFieldType.RELATIONSHIP,
          [VALID_ID],
          withQty,
        );
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('ROLLUP', () => {
    it('sempre rejeita escrita direta', () => {
      const result = validateValue(
        CustomFieldType.ROLLUP,
        42,
        def(CustomFieldType.ROLLUP),
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('readonly');
    });
  });

  describe('legados — column populada', () => {
    it('TEXT retorna column=valueText', () => {
      const result = validateValue(
        CustomFieldType.TEXT,
        'oi',
        def(CustomFieldType.TEXT),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueText');
    });

    it('NUMBER retorna column=valueNumber', () => {
      const result = validateValue(
        CustomFieldType.NUMBER,
        7,
        def(CustomFieldType.NUMBER),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueNumber');
    });

    it('DATE retorna column=valueDate', () => {
      const result = validateValue(
        CustomFieldType.DATE,
        '2026-05-13T00:00:00Z',
        def(CustomFieldType.DATE),
      );
      expect(result.valid).toBe(true);
      expect(result.column).toBe('valueDate');
      expect(result.normalized).toBeInstanceOf(Date);
    });
  });
});
