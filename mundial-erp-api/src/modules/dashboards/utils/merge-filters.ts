/**
 * merge-filters — ADR-008
 *
 * Helper puro e deterministico que combina `cardFilters` (extraidos do
 * `dataSource.filters` do card, pre-validados contra a whitelist) com
 * `globalFilters` (filtros globais do dashboard, ja validados) aplicando
 * INTERSECAO estrita por `field`.
 *
 * Regra inviolavel (red flag P0 do squad-dashboards, linha 361 do skill):
 * filtro global NUNCA pode AMPLIAR o escopo autorizado pelo card — so pode
 * RESTRINGIR. Quando card e global tocam o mesmo field, calculamos a
 * intersecao entre os conjuntos; se vazia, retornamos `EMPTY_INTERSECTION`
 * (sentinel) para o caller despachar o empty-result shape do CardType
 * sem consultar o Prisma.
 *
 * Nao faz I/O, nao injeta dependencias, nao loga. Import externo zero.
 */
import type { GlobalFilter } from '../dashboard-card-query.service';

export const EMPTY_INTERSECTION = Symbol('dashboards:empty-intersection');
export type EmptyIntersection = typeof EMPTY_INTERSECTION;

export type MergedWhere = Record<string, unknown> & {
  AND?: Array<Record<string, unknown>>;
};

// Operators que produzem "conjuntos" analisaveis em memoria (interseccao
// calculavel antecipadamente). Demais operators sao resolvidos via `AND`
// composto do Prisma (defensive fallback, seguro e previsivel).
const SET_OPERATORS = new Set(['EQUALS', 'IN']);

type NormalizedFilter = {
  operator: string;
  value: unknown;
};

/**
 * Normaliza um filtro card-side ja sob shape Prisma (`where[field] = ...`)
 * para `{ operator, value }`, quando possivel. Retorna `null` quando o shape
 * nao corresponde a EQUALS/IN (ex: `{ gt: 10 }`, `{ not: x }`, `{ gte, lte }`).
 */
function normalizeCardFilter(raw: unknown): NormalizedFilter | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') {
    // valor escalar direto => EQUALS
    return { operator: 'EQUALS', value: raw };
  }
  // objeto: pode ser { in: [...] } ou combinador Prisma.
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj)) {
    return { operator: 'IN', value: obj };
  }
  if ('in' in obj && Array.isArray(obj.in)) {
    return { operator: 'IN', value: obj.in };
  }
  if (
    'equals' in obj &&
    Object.keys(obj).length === 1 &&
    obj.equals !== undefined
  ) {
    return { operator: 'EQUALS', value: obj.equals };
  }
  // Operators comparativos / not / between => nao "set-like".
  return null;
}

/** Constroi o clause Prisma a partir de `{ operator, value }`. */
function toPrismaClause(n: NormalizedFilter): unknown {
  switch (n.operator) {
    case 'EQUALS':
      return n.value;
    case 'NOT_EQUALS':
      return { not: n.value };
    case 'GREATER':
      return { gt: n.value };
    case 'LESS':
      return { lt: n.value };
    case 'BETWEEN': {
      const arr = n.value as [unknown, unknown];
      return { gte: arr[0], lte: arr[1] };
    }
    case 'IN': {
      const arr = Array.isArray(n.value) ? n.value : [n.value];
      return { in: arr };
    }
    default:
      // Operator desconhecido nao deveria chegar aqui (service ja valida);
      // fallback defensivo devolve o valor cru para ser capturado por `AND`.
      return n.value;
  }
}

/** Iguais (`===`) ou ambos arrays com mesmos elementos (ordem-insensitive). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }
  return false;
}

/** Intersecao de arrays preservando ordem do primeiro argumento, sem duplicatas. */
function intersectArrays(a: unknown[], b: unknown[]): unknown[] {
  const set = new Set(b);
  const seen = new Set<unknown>();
  const out: unknown[] = [];
  for (const v of a) {
    if (set.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Merge de duas clausulas normalizaveis (EQUALS/IN x EQUALS/IN).
 * Retorna `null` se algum dos lados nao for set-like (caller trata via AND).
 * Retorna `EMPTY_INTERSECTION` quando interseccao e vazia.
 */
function mergeSetLike(
  a: NormalizedFilter,
  b: NormalizedFilter,
): NormalizedFilter | EmptyIntersection | null {
  if (!SET_OPERATORS.has(a.operator) || !SET_OPERATORS.has(b.operator)) {
    return null;
  }

  // EQUALS x EQUALS
  if (a.operator === 'EQUALS' && b.operator === 'EQUALS') {
    return sameValue(a.value, b.value) ? a : EMPTY_INTERSECTION;
  }

  // IN x IN
  if (a.operator === 'IN' && b.operator === 'IN') {
    const arrA = Array.isArray(a.value) ? a.value : [a.value];
    const arrB = Array.isArray(b.value) ? b.value : [b.value];
    const inter = intersectArrays(arrA, arrB);
    if (inter.length === 0) return EMPTY_INTERSECTION;
    if (inter.length === 1) return { operator: 'EQUALS', value: inter[0] };
    return { operator: 'IN', value: inter };
  }

  // EQUALS x IN (ou IN x EQUALS) — EQUALS precisa estar contido no IN.
  const eq = a.operator === 'EQUALS' ? a : b;
  const inF = a.operator === 'IN' ? a : b;
  const arr = Array.isArray(inF.value) ? inF.value : [inF.value];
  return arr.includes(eq.value)
    ? { operator: 'EQUALS', value: eq.value }
    : EMPTY_INTERSECTION;
}

/**
 * Tenta compor dois Prisma clauses num unico objeto via merge de chaves
 * disjuntas (gt/lt/gte/lte/not/equals/in). Retorna `null` se houver colisao
 * de chave (ex: ambos tem `gt`) ou se algum dos lados nao for object-clause.
 * Quando sucesso, o resultado e semanticamente AND (Prisma avalia todas as
 * sub-chaves num filtro juntas).
 */
function tryComposeObjectClauses(
  a: unknown,
  b: unknown,
): Record<string, unknown> | null {
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) ||
    Array.isArray(b)
  ) {
    return null;
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  for (const key of Object.keys(ob)) {
    if (key in oa) return null; // colisao — nao e seguro mesclar.
  }
  return { ...oa, ...ob };
}

/** Agrupa globalFilters por field. */
function groupGlobalByField(
  globals: GlobalFilter[],
  allowedFields: ReadonlySet<string>,
): Map<string, GlobalFilter[]> {
  const m = new Map<string, GlobalFilter[]>();
  for (const gf of globals) {
    if (!allowedFields.has(gf.field)) continue;
    const bucket = m.get(gf.field) ?? [];
    bucket.push(gf);
    m.set(gf.field, bucket);
  }
  return m;
}

/**
 * Aplica INTERSECAO entre `cardFilters` e `globalFilters`. Retorna o
 * `where` Prisma-compatible (sem `workspaceId`; isso fica no caller) ou
 * o sentinel `EMPTY_INTERSECTION` quando qualquer field em comum tem
 * interseccao vazia.
 *
 * Escopo do helper:
 *  - Respeita `allowedFields` — qualquer chave fora da whitelist e descartada
 *    silenciosamente (mesma semantica do `buildWhere` original).
 *  - Valores `null`/`undefined` em `cardFilters` sao descartados.
 *  - Fallback defensivo: combos nao set-like caem em `AND` composto do Prisma.
 */
export function mergeFilters(
  cardFilters: Record<string, unknown>,
  globalFilters: GlobalFilter[],
  allowedFields: ReadonlySet<string>,
): MergedWhere | EmptyIntersection {
  const where: MergedWhere = {};
  const andClauses: Array<Record<string, unknown>> = [];

  // Snapshot "dedup" dos filtros de card que passam pela whitelist.
  const cardEntries: Array<[string, unknown]> = [];
  for (const [key, val] of Object.entries(cardFilters)) {
    if (val === null || val === undefined) continue;
    if (!allowedFields.has(key)) continue;
    cardEntries.push([key, val]);
  }

  const globalByField = groupGlobalByField(globalFilters, allowedFields);
  const cardFieldSet = new Set(cardEntries.map(([k]) => k));

  // 1) Fields presentes apenas no card (sem global correspondente).
  for (const [field, val] of cardEntries) {
    if (!globalByField.has(field)) {
      where[field] = val;
    }
  }

  // 2) Fields presentes apenas no global.
  for (const [field, gfs] of globalByField.entries()) {
    if (cardFieldSet.has(field)) continue;
    if (gfs.length === 1) {
      where[field] = toPrismaClause({
        operator: gfs[0].operator,
        value: gfs[0].value,
      });
      continue;
    }
    // Multiplos globals no mesmo field (raro, mas possivel) => AND entre eles.
    for (const gf of gfs) {
      andClauses.push({
        [field]: toPrismaClause({ operator: gf.operator, value: gf.value }),
      });
    }
  }

  // 3) Fields presentes em ambos — intersecao estrita.
  for (const [field, cardVal] of cardEntries) {
    const gfs = globalByField.get(field);
    if (!gfs) continue;

    const cardNorm = normalizeCardFilter(cardVal);

    // Tentativa analitica: set-like x set-like via mergeSetLike.
    if (cardNorm && gfs.length === 1) {
      const globalNorm: NormalizedFilter = {
        operator: gfs[0].operator,
        value: gfs[0].value,
      };
      const merged = mergeSetLike(cardNorm, globalNorm);
      if (merged === EMPTY_INTERSECTION) return EMPTY_INTERSECTION;
      if (merged !== null) {
        where[field] = toPrismaClause(merged);
        continue;
      }
    }

    // Tentativa de compose em Prisma-native (AND implicito por merge de chaves):
    // combos comparativos (gt/lt/gte/lte/not/between) produzem object clauses com
    // chaves disjuntas — o Prisma avalia todas como AND na mesma sub-where. Isso
    // e mais compacto que andClauses top-level e preservado pelo pino do Hugo.
    if (gfs.length === 1) {
      const composed = tryComposeObjectClauses(
        cardVal,
        toPrismaClause({
          operator: gfs[0].operator,
          value: gfs[0].value,
        }),
      );
      if (composed !== null) {
        where[field] = composed;
        continue;
      }
    }

    // Fallback final: AND composto top-level. Seguro (AND so restringe),
    // porem menos compacto — usado quando ha multiplos globals no mesmo
    // field OU quando chaves colidem (ex: card `gt:10` + global `gt:20`).
    andClauses.push({ [field]: cardVal });
    for (const gf of gfs) {
      andClauses.push({
        [field]: toPrismaClause({ operator: gf.operator, value: gf.value }),
      });
    }
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  return where;
}
