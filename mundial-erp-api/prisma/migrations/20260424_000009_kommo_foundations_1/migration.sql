-- ============================================================================
-- Kommo Foundations — Migration 1/2 (Sprint 1, story K1-3)
-- ----------------------------------------------------------------------------
-- Parte 1 da integracao Kommo + Dashboard "Analytics Comercial". Escopo
-- estrito: 5 enums + 4 tabelas prioritarias (KommoAccount, KommoConversation,
-- KommoMessage, KommoWebhookEvent).
--
-- Fonte: PLANO-KOMMO-DASHBOARD §5.1 e §5.2. Os 7 models restantes
-- (KommoPipeline, KommoStatus, KommoDepartment, KommoAgent, KommoLead,
-- KommoSyncCheckpoint, KommoMetricSnapshot) chegam em Sprint 2 via migration
-- `kommo_foundations_2`.
--
-- Principio: aditiva-apenas. Nenhuma tabela existente e alterada, exceto
-- `workspaces`: 1:1 Workspace<->KommoAccount enforcada via UNIQUE em
-- `kommo_accounts.workspace_id` + FK ON DELETE CASCADE.
--
-- Tokens (`access_token`, `refresh_token`, `hmac_secret`) entram como TEXT
-- NOT NULL/NULLABLE por ora; a envelope encryption ficara a cargo da
-- ADR-006 (pendente). Coluna em DB ainda TEXT apos ADR — muda apenas o
-- writer/reader no service layer.
-- ============================================================================

-- CreateEnum
CREATE TYPE "KommoAuthType" AS ENUM ('OAUTH2', 'LONG_LIVED_TOKEN');

-- CreateEnum
CREATE TYPE "KommoAccountStatus" AS ENUM ('ACTIVE', 'TOKEN_EXPIRED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KommoMessageDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "KommoConversationStatus" AS ENUM ('OPEN', 'WAITING_RESPONSE', 'WAITING_CLIENT', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KommoWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DEDUPLICATED', 'DLQ');

-- ----------------------------------------------------------------------------
-- kommo_accounts
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "kommo_accounts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "auth_type" "KommoAuthType" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "hmac_secret" TEXT NOT NULL,
    "status" "KommoAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMP(3),
    "connected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_accounts_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- kommo_conversations
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "kommo_conversations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kommo_chat_id" BIGINT NOT NULL,
    "lead_id" TEXT,
    "responsible_agent_id" TEXT,
    "department_id" TEXT,
    "status" "KommoConversationStatus" NOT NULL DEFAULT 'OPEN',
    "first_message_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_conversations_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- kommo_messages
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "kommo_messages" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "kommo_message_id" TEXT NOT NULL,
    "direction" "KommoMessageDirection" NOT NULL,
    "author_agent_id" TEXT,
    "content_preview" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kommo_messages_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- kommo_webhook_events — tabela operacional (hard delete via purge cron)
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "kommo_webhook_events" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "KommoWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kommo_webhook_events_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indexes & Unique Constraints
-- ----------------------------------------------------------------------------

-- CreateIndex
CREATE UNIQUE INDEX "kommo_accounts_workspace_id_key" ON "kommo_accounts"("workspace_id");

-- CreateIndex
CREATE INDEX "kommo_conversations_workspace_id_status_idx" ON "kommo_conversations"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "kommo_conversations_workspace_id_responsible_agent_id_idx" ON "kommo_conversations"("workspace_id", "responsible_agent_id");

-- CreateIndex
CREATE INDEX "kommo_conversations_workspace_id_resolved_at_idx" ON "kommo_conversations"("workspace_id", "resolved_at");

-- CreateIndex
CREATE INDEX "kommo_conversations_workspace_id_created_at_idx" ON "kommo_conversations"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "kommo_conversations_workspace_id_kommo_chat_id_key" ON "kommo_conversations"("workspace_id", "kommo_chat_id");

-- CreateIndex
CREATE INDEX "kommo_messages_workspace_id_created_at_idx" ON "kommo_messages"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "kommo_messages_conversation_id_created_at_idx" ON "kommo_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "kommo_messages_workspace_id_direction_created_at_idx" ON "kommo_messages"("workspace_id", "direction", "created_at");

-- CreateIndex
CREATE INDEX "kommo_messages_workspace_id_author_agent_id_created_at_idx" ON "kommo_messages"("workspace_id", "author_agent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "kommo_messages_workspace_id_kommo_message_id_key" ON "kommo_messages"("workspace_id", "kommo_message_id");

-- CreateIndex
CREATE INDEX "kommo_webhook_events_workspace_id_status_received_at_idx" ON "kommo_webhook_events"("workspace_id", "status", "received_at");

-- CreateIndex
CREATE INDEX "kommo_webhook_events_workspace_id_event_type_received_at_idx" ON "kommo_webhook_events"("workspace_id", "event_type", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "kommo_webhook_events_workspace_id_event_id_key" ON "kommo_webhook_events"("workspace_id", "event_id");

-- ----------------------------------------------------------------------------
-- Foreign Keys
-- ----------------------------------------------------------------------------

-- AddForeignKey
ALTER TABLE "kommo_accounts" ADD CONSTRAINT "kommo_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kommo_conversations" ADD CONSTRAINT "kommo_conversations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kommo_messages" ADD CONSTRAINT "kommo_messages_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "kommo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kommo_messages" ADD CONSTRAINT "kommo_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "kommo_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
