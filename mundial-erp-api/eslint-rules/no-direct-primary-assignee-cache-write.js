'use strict';

/**
 * ESLint rule: no-direct-primary-assignee-cache-write (ADR-001)
 *
 * Proíbe:
 *   - <workItem>.create|createMany|update|updateMany|upsert({ data: { primaryAssigneeCache: ... } })
 *   - <workItem>.create({ data: [{ ... primaryAssigneeCache: ... }] }) (createMany com array)
 *
 * Exceção:
 *   - Arquivo `primary-assignee-cache.extension.ts` (caminho termina em
 *     `src/database/extensions/primary-assignee-cache.extension.ts` ou seu
 *     spec) — é o único local autorizado a escrever direto.
 *
 * Motivo:
 *   `WorkItem.primaryAssigneeCache` é um cache derivado de `WorkItemAssignee`.
 *   Escrita direta fora da Prisma extension causa divergência silenciosa
 *   com a fonte de verdade. Ver ADR-001.
 *
 * Severidade esperada: `error` (bloqueia merge).
 */

const MESSAGE =
  'Direct write to WorkItem.primaryAssigneeCache is forbidden. Use WorkItemAssignee via PrismaService and let the extension compute it. See ADR-001.';

const EXEMPT_PATHS = [
  'src/database/extensions/primary-assignee-cache.extension.ts',
  'src/database/extensions/primary-assignee-cache.extension.spec.ts',
];

function isExemptFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return EXEMPT_PATHS.some((p) => normalized.endsWith(p));
}

/**
 * Dado um ObjectExpression ({ key: value, ... }), retorna true se ele
 * contém `primaryAssigneeCache` como property (direta ou em spread que
 * podemos inspecionar estaticamente).
 */
function objectMentionsPrimaryAssigneeCache(node) {
  if (!node || node.type !== 'ObjectExpression') return false;
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    const key = prop.key;
    if (
      (key.type === 'Identifier' && key.name === 'primaryAssigneeCache') ||
      (key.type === 'Literal' && key.value === 'primaryAssigneeCache')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Dado o `arguments[0]` de uma call tipo `.create(args)`, verifica se
 * `args.data` (ObjectExpression ou ArrayExpression de ObjectExpression)
 * menciona `primaryAssigneeCache`.
 */
function callArgsMentionCache(firstArg) {
  if (!firstArg || firstArg.type !== 'ObjectExpression') return false;
  for (const prop of firstArg.properties) {
    if (prop.type !== 'Property') continue;
    const key = prop.key;
    const isDataKey =
      (key.type === 'Identifier' && key.name === 'data') ||
      (key.type === 'Literal' && key.value === 'data') ||
      (key.type === 'Identifier' && key.name === 'create') ||
      (key.type === 'Literal' && key.value === 'create') ||
      (key.type === 'Identifier' && key.name === 'update') ||
      (key.type === 'Literal' && key.value === 'update');
    if (!isDataKey) continue;
    const value = prop.value;
    if (value.type === 'ObjectExpression') {
      if (objectMentionsPrimaryAssigneeCache(value)) return true;
    } else if (value.type === 'ArrayExpression') {
      for (const el of value.elements) {
        if (el && objectMentionsPrimaryAssigneeCache(el)) return true;
      }
    }
  }
  return false;
}

const TRIGGER_METHODS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe escrita direta em WorkItem.primaryAssigneeCache fora da Prisma extension (ADR-001).',
    },
    schema: [],
    messages: { forbidden: MESSAGE },
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (isExemptFile(filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        // Só olhamos chamadas tipo x.y(...) com y em TRIGGER_METHODS.
        if (node.callee.type !== 'MemberExpression') return;
        const method = node.callee.property;
        if (!method) return;
        const methodName =
          method.type === 'Identifier'
            ? method.name
            : method.type === 'Literal'
              ? String(method.value)
              : null;
        if (!methodName || !TRIGGER_METHODS.has(methodName)) return;
        const firstArg = node.arguments[0];
        if (callArgsMentionCache(firstArg)) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};
