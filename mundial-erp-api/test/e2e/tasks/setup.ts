/**
 * E2E test helpers para a feature Tasks.
 *
 * POR QUE: Sprint 0 entrega infra reutilizavel para Sprints 1+. Cada spec
 * chama helpers aqui em vez de replicar boilerplate de autenticacao +
 * criacao de workspace/process/task. Objetivo e eliminar o drift entre
 * especs e manter cleanup deterministico (lesson learned: workspace-isolation
 * leakou dados antes de introduzirmos ordem cascata).
 *
 * Pre-requisitos Sprint 1: Migration 1/3 (tasks_foundations) aplicada +
 * CustomTaskType builtin seedado. Antes disso, helpers de task ainda rodam
 * contra WorkItem atual (campos novos sao nullable — additive-only).
 */

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../../../src/database/prisma.service';

export interface TestWorkspace {
  workspaceId: string;
  ownerUserId: string;
  ownerEmail: string;
  token: string;
  refreshToken: string;
}

export interface TestUser {
  userId: string;
  email: string;
  token: string;
  refreshToken: string;
}

export interface TestProcess {
  processId: string;
  departmentId: string;
  areaId: string;
  defaultStatusId: string;
}

export interface TestTask {
  taskId: string;
}

export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface TaskOverrides {
  title?: string;
  priority?: 'NONE' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  customTypeId?: string;
}

const uniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const registerAndLogin = async (
  app: INestApplication<App>,
  email: string,
  name: string,
): Promise<{ userId: string; tokens: AuthTokens }> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, name, password: 'senha12345' })
    .expect(201);

  return {
    userId: res.body.data.user.id as string,
    tokens: {
      accessToken: res.body.data.accessToken as string,
      refreshToken: res.body.data.refreshToken as string,
    },
  };
};

const refreshTokens = async (
  app: INestApplication<App>,
  refreshToken: string,
): Promise<AuthTokens> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/refresh')
    .send({ refreshToken })
    .expect(200);

  return {
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
  };
};

/**
 * Cria workspace isolado com owner ADMIN ja com token de workspace selecionado.
 * Usado por todas suites — garante isolamento e cleanup cascata.
 */
export const createTestWorkspace = async (
  app: INestApplication<App>,
): Promise<TestWorkspace> => {
  const prisma = app.get(PrismaService);
  const ownerEmail = `${uniqueId('tasks-owner')}@mundial.test`;

  const { userId: ownerUserId, tokens: initialTokens } = await registerAndLogin(
    app,
    ownerEmail,
    'Tasks Owner',
  );

  // Owner precisa ter role ADMIN no nivel User para criar Department/Process
  // depois. Ajuste via DB — ver auth/rbac: role do User e separado do
  // WorkspaceMemberRole.
  await prisma.user.update({
    where: { id: ownerUserId },
    data: { role: 'ADMIN' },
  });

  const afterRoleBump = await refreshTokens(app, initialTokens.refreshToken);

  const wsSlug = uniqueId('tasks-ws');
  const wsCreate = await request(app.getHttpServer())
    .post('/api/v1/workspaces')
    .set('Authorization', `Bearer ${afterRoleBump.accessToken}`)
    .send({ name: `Tasks WS ${wsSlug}`, slug: wsSlug })
    .expect(201);

  const workspaceId = wsCreate.body.data.id as string;

  const select = await request(app.getHttpServer())
    .post(`/api/v1/workspaces/${workspaceId}/select`)
    .set('Authorization', `Bearer ${afterRoleBump.accessToken}`)
    .expect(200);

  return {
    workspaceId,
    ownerUserId,
    ownerEmail,
    token: select.body.data.accessToken as string,
    refreshToken: select.body.data.refreshToken as string,
  };
};

/**
 * Cria usuario secundario ja como membro do workspace no role indicado.
 * Retorna token com workspaceId selecionado.
 */
export const createTestUser = async (
  app: INestApplication<App>,
  workspaceId: string,
  role: WorkspaceRole = 'OPERATOR',
): Promise<TestUser> => {
  const prisma = app.get(PrismaService);
  const email = `${uniqueId('tasks-user')}@mundial.test`;

  const { userId, tokens } = await registerAndLogin(app, email, 'Tasks User');

  // Role no nivel User (necessario para alguns controllers). WorkspaceMemberRole
  // e atribuido em paralelo via tabela de join.
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    },
  });

  const refreshed = await refreshTokens(app, tokens.refreshToken);

  const select = await request(app.getHttpServer())
    .post(`/api/v1/workspaces/${workspaceId}/select`)
    .set('Authorization', `Bearer ${refreshed.accessToken}`)
    .expect(200);

  return {
    userId,
    email,
    token: select.body.data.accessToken as string,
    refreshToken: select.body.data.refreshToken as string,
  };
};

/**
 * Cria department + area + process (LIST) + status default direto via Prisma.
 * Evita dependencia de endpoints BPM ainda em construcao. Process recebe
 * `processType = LIST` (container de WorkItems — ver PLANO-TASKS §4).
 */
export const createTestProcess = async (
  app: INestApplication<App>,
  workspaceId: string,
): Promise<TestProcess> => {
  const prisma = app.get(PrismaService);
  const suffix = uniqueId('p');

  const department = await prisma.department.create({
    data: {
      workspaceId,
      name: `Dept ${suffix}`,
      slug: `dept-${suffix}`,
    },
  });

  const area = await prisma.area.create({
    data: {
      name: `Area ${suffix}`,
      slug: `area-${suffix}`,
      departmentId: department.id,
    },
  });

  const defaultStatus = await prisma.workflowStatus.create({
    data: {
      name: 'To Do',
      category: 'NOT_STARTED',
      color: '#94a3b8',
      departmentId: department.id,
      areaId: area.id,
      isDefault: true,
    },
  });

  const processRecord = await prisma.process.create({
    data: {
      name: `Process ${suffix}`,
      slug: `process-${suffix}`,
      departmentId: department.id,
      areaId: area.id,
      processType: 'LIST',
      status: 'ACTIVE',
    },
  });

  return {
    processId: processRecord.id,
    departmentId: department.id,
    areaId: area.id,
    defaultStatusId: defaultStatus.id,
  };
};

/**
 * Cria WorkItem minimo via Prisma (sem passar pela API). Util para popular
 * estado antes de testar mutacoes. Quando precisar testar o endpoint real
 * (POST /tasks), faca request direto — nao use este helper.
 */
export const createTestTask = async (
  app: INestApplication<App>,
  processContext: TestProcess,
  creatorUserId: string,
  overrides: TaskOverrides = {},
): Promise<TestTask> => {
  const prisma = app.get(PrismaService);

  const task = await prisma.workItem.create({
    data: {
      processId: processContext.processId,
      statusId: processContext.defaultStatusId,
      title: overrides.title ?? `Task ${uniqueId('t')}`,
      creatorId: creatorUserId,
      priority: overrides.priority ?? 'NONE',
      primaryAssigneeCache: overrides.assigneeId,
      startDate: overrides.startDate ? new Date(overrides.startDate) : undefined,
      dueDate: overrides.dueDate ? new Date(overrides.dueDate) : undefined,
      customTypeId: overrides.customTypeId,
    },
    select: { id: true },
  });

  return { taskId: task.id };
};

/**
 * Cleanup cascata: remove tudo criado por este workspace. Usa soft delete em
 * entidades com `deletedAt`, hard delete em join tables e tipos transientes.
 * Ordem importa — FKs seguras primeiro. Envolto em transaction para atomicidade.
 *
 * TODO Sprint 3 (Migration 3/3): estender para novas entidades
 * (WorkItemAssignee, WorkItemTag, WorkItemChecklist, etc).
 */
export const cleanupWorkspace = async (
  app: INestApplication<App>,
  workspaceId: string,
): Promise<void> => {
  const prisma = app.get(PrismaService);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const departments = await tx.department.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const departmentIds = departments.map((d) => d.id);

    if (departmentIds.length > 0) {
      const processes = await tx.process.findMany({
        where: { departmentId: { in: departmentIds } },
        select: { id: true },
      });
      const processIds = processes.map((p) => p.id);

      if (processIds.length > 0) {
        await tx.workItem.updateMany({
          where: { processId: { in: processIds } },
          data: { deletedAt: now },
        });
      }

      await tx.workflowStatus.updateMany({
        where: { departmentId: { in: departmentIds } },
        data: { deletedAt: now },
      });

      if (processIds.length > 0) {
        await tx.process.updateMany({
          where: { id: { in: processIds } },
          data: { deletedAt: now },
        });
      }

      await tx.area.updateMany({
        where: { departmentId: { in: departmentIds } },
        data: { deletedAt: now },
      });

      await tx.department.updateMany({
        where: { id: { in: departmentIds } },
        data: { deletedAt: now },
      });
    }

    await tx.workspaceMember.deleteMany({ where: { workspaceId } });
    await tx.workspace.updateMany({
      where: { id: workspaceId },
      data: { deletedAt: now },
    });
  });
};
