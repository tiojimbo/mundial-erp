'use strict';

/**
 * ESLint rule: no-direct-activity-write (ADR-002)
 *
 * Proíbe:
 *   - <...>.workItemActivity.create(...)
 *   - <...>.workItemActivity.createMany(...)
 *   - <...>.workItemActivity.update(...)
 *   - <...>.workItemActivity.updateMany(...)
 *   - <...>.workItemActivity.upsert(...)
 *
 * Fora de:
 *   - `src/modules/task-outbox/task-outbox.worker.ts` (único escritor legítimo)
 *   - Arquivos de teste (`*.spec.ts`, `*.e2e-spec.ts`, `test/**`)
 *
 * Motivo:
 *   O feed de atividades é uma projeção derivada do outbox. Escrever
 *   direto fora do worker viola ADR-002 e produz atividades sem
 *   correlação com o evento de domínio.
 */

const MESSAGE =
  'Direct write to WorkItemActivity is forbidden. Activity feed is a projection — only task-outbox.worker.ts may write it. See ADR-002.';

const EXEMPT_SUFFIXES = [
  'src/modules/task-outbox/task-outbox.worker.ts',
];

function isExemptFile(filename) {
  const n = filename.replace(/\\/g, '/');
  if (EXEMPT_SUFFIXES.some((p) => n.endsWith(p))) return true;
  if (n.endsWith('.spec.ts') || n.endsWith('.e2e-spec.ts')) return true;
  if (n.includes('/test/')) return true;
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
        'Proíbe escrita direta em WorkItemActivity fora de task-outbox.worker.ts (ADR-002).',
    },
    schema: [],
    messages: { forbidden: MESSAGE },
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (isExemptFile(filename)) return {};
    return {
      CallExpression(node) {
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

        // Callee: <obj>.<method> — obj precisa ser <something>.workItemActivity
        const objNode = node.callee.object;
        if (!objNode || objNode.type !== 'MemberExpression') return;
        const delegate = objNode.property;
        if (!delegate) return;
        const delegateName =
          delegate.type === 'Identifier'
            ? delegate.name
            : delegate.type === 'Literal'
              ? String(delegate.value)
              : null;
        if (delegateName !== 'workItemActivity') return;

        context.report({ node, messageId: 'forbidden' });
      },
    };
  },
};
