/**
 * Setup global do Vitest (Sprint 2 — TTT-024).
 *
 * Importa matchers de DOM do Testing Library para que `expect(el).toBeInTheDocument()`
 * etc. funcionem em todos os testes sem precisar importar caso a caso.
 */
import '@testing-library/jest-dom/vitest';
