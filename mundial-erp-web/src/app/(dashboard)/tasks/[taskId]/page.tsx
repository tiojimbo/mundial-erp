import { TaskView } from '@/features/tasks/components/task-view/task-view';

/**
 * Sprint 5 (TSK-150) — Rota /tasks/[taskId].
 *
 * EXCECAO documentada a regra #13 do PLANO-TASKS.md
 * ("export default proibido, exceto app/.../page.tsx"): o App Router do
 * Next 14 exige `export default` em arquivos `page.tsx`. Esta e a unica
 * excecao aceita pelo projeto. Todos os componentes subordinados
 * (features/tasks/components/task-view/*) usam NAMED EXPORTS.
 *
 * @see .claude/plan/PLANO-TASKS.md §11 regra #13
 */
export default function TaskPage({
  params,
}: {
  params: { taskId: string };
}) {
  return <TaskView taskId={params.taskId} />;
}
