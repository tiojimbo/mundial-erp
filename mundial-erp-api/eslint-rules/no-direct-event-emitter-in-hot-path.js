'use strict';

/**
 * ESLint rule: no-direct-event-emitter-in-hot-path (ADR-003)
 *
 * Proíbe `.emit(` em EventEmitter2 dentro dos módulos de tasks (hot path).
 * Força o uso de `TaskOutboxService.enqueue()`.
 *
 * Heurística (estática, sem type info): detecta chamadas de método cujo
 * nome seja `emit` e o objeto receptor tenha nome contendo `eventEmitter`
 * (insensitive). Isso cobre o padrão idiomático `this.eventEmitter.emit(...)`
 * e variantes (`eventEmitter2`, `eventBus` — ajustável aqui).
 *
 * Escopo restrito aos arquivos dentro de:
 *   - src/modules/tasks/**
 *   - src/modules/work-items/**
 *   - src/modules/task-outbox/**
 *   - src/modules/task-*\/\*\*
 *   - src/modules/custom-task-types/**
 *
 * Exceções:
 *   - Arquivos de teste
 *   - Comentário `// outbox-exempt: <motivo>` na linha anterior à call.
 */

const MESSAGE =
  'EventEmitter2.emit is forbidden in tasks hot path. Use TaskOutboxService.enqueue() inside the $transaction. See ADR-003.';

const SCOPE_PATTERNS = [
  /src\/modules\/tasks\//,
  /src\/modules\/work-items\//,
  /src\/modules\/task-outbox\//,
  /src\/modules\/task-[^/]+\//,
  /src\/modules\/custom-task-types\//,
];

function inScope(filename) {
  const n = filename.replace(/\\/g, '/');
  if (n.endsWith('.spec.ts') || n.endsWith('.e2e-spec.ts')) return false;
  return SCOPE_PATTERNS.some((re) => re.test(n));
}

function isEventEmitterReceiver(objNode) {
  if (!objNode) return false;
  if (objNode.type === 'Identifier') {
    return /eventemitter|eventbus/i.test(objNode.name);
  }
  if (objNode.type === 'MemberExpression') {
    const prop = objNode.property;
    if (!prop) return false;
    const name =
      prop.type === 'Identifier'
        ? prop.name
        : prop.type === 'Literal'
          ? String(prop.value)
          : '';
    if (/eventemitter|eventbus/i.test(name)) return true;
    // Recorre o caminho (ex: this.someService.eventEmitter.emit(...)).
    return isEventEmitterReceiver(objNode.object);
  }
  if (objNode.type === 'ThisExpression') return false;
  return false;
}

function hasExemptComment(context, node) {
  const sc = context.sourceCode ?? context.getSourceCode?.();
  if (!sc) return false;
  const comments = sc.getCommentsBefore(node);
  return comments.some((c) => /outbox-exempt/.test(c.value));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe EventEmitter2.emit em módulos de tasks — forçar uso do outbox (ADR-003).',
    },
    schema: [],
    messages: { forbidden: MESSAGE },
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (!inScope(filename)) return {};
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
        if (methodName !== 'emit') return;
        if (!isEventEmitterReceiver(node.callee.object)) return;
        if (hasExemptComment(context, node)) return;
        context.report({ node, messageId: 'forbidden' });
      },
    };
  },
};
