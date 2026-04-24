
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface CheckA11yOptions {
  /** CSS selector para restringir a analise (default: documento inteiro). */
  context?: string;
  /** Tags WCAG adicionais (default: wcag2a, wcag2aa, wcag21aa). */
  tags?: string[];
  /** Se true, falha em `moderate` tambem (default: false — so critical+serious). */
  strict?: boolean;
}

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];
const BLOCKING_IMPACTS_DEFAULT = new Set(['critical', 'serious']);
const BLOCKING_IMPACTS_STRICT = new Set([
  'critical',
  'serious',
  'moderate',
]);

export async function checkA11y(
  page: Page,
  options: CheckA11yOptions = {},
): Promise<void> {
  const tags = options.tags ?? DEFAULT_TAGS;
  const blocking = options.strict
    ? BLOCKING_IMPACTS_STRICT
    : BLOCKING_IMPACTS_DEFAULT;

  let builder = new AxeBuilder({ page }).withTags(tags);
  if (options.context) {
    builder = builder.include(options.context);
  }

  const { violations } = await builder.analyze();

  const blockingViolations = violations.filter(
    (v) => v.impact !== undefined && v.impact !== null && blocking.has(v.impact),
  );
  const nonBlocking = violations.filter(
    (v) => v.impact === undefined || v.impact === null || !blocking.has(v.impact),
  );

  for (const v of nonBlocking) {
    // Nao falha; apenas registra para revisao humana.
    // eslint-disable-next-line no-console
    console.warn(
      `[a11y warning] ${v.id} (${v.impact ?? 'unknown'}) — ${v.help} — ${v.helpUrl}`,
    );
  }

  if (blockingViolations.length > 0) {
    const summary = blockingViolations
      .map(
        (v) =>
          `- ${v.id} [${v.impact ?? 'unknown'}] ${v.help}\n  nodes: ${v.nodes.length}\n  ${v.helpUrl}`,
      )
      .join('\n');
    throw new Error(
      `axe-core: ${blockingViolations.length} violation(s) bloqueante(s) (WCAG AA):\n${summary}`,
    );
  }
}
