
-- CreateEnum
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "carriers" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "chat_channels" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "client_classifications" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "dashboards" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "delivery_routes" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "financial_categories" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "order_flows" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "order_models" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "order_types" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "price_tables" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "product_departments" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "product_types" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "status_templates" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "unit_measures" ADD COLUMN     "workspace_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_accessed_workspace_id" TEXT;

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "color" TEXT,
    "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE',
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "idx_ws_members_user" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_ws_members_ws_role" ON "workspace_members"("workspace_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");

-- CreateIndex
CREATE INDEX "idx_ws_invites_email_ws" ON "workspace_invites"("email", "workspace_id");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "brands_workspace_id_idx" ON "brands"("workspace_id");

-- CreateIndex
CREATE INDEX "carriers_workspace_id_idx" ON "carriers"("workspace_id");

-- CreateIndex
CREATE INDEX "chat_channels_workspace_id_idx" ON "chat_channels"("workspace_id");

-- CreateIndex
CREATE INDEX "client_classifications_workspace_id_idx" ON "client_classifications"("workspace_id");

-- CreateIndex
CREATE INDEX "clients_workspace_id_idx" ON "clients"("workspace_id");

-- CreateIndex
CREATE INDEX "companies_workspace_id_idx" ON "companies"("workspace_id");

-- CreateIndex
CREATE INDEX "dashboards_workspace_id_idx" ON "dashboards"("workspace_id");

-- CreateIndex
CREATE INDEX "delivery_routes_workspace_id_idx" ON "delivery_routes"("workspace_id");

-- CreateIndex
CREATE INDEX "departments_workspace_id_idx" ON "departments"("workspace_id");

-- CreateIndex
CREATE INDEX "financial_categories_workspace_id_idx" ON "financial_categories"("workspace_id");

-- CreateIndex
CREATE INDEX "order_flows_workspace_id_idx" ON "order_flows"("workspace_id");

-- CreateIndex
CREATE INDEX "order_models_workspace_id_idx" ON "order_models"("workspace_id");

-- CreateIndex
CREATE INDEX "order_types_workspace_id_idx" ON "order_types"("workspace_id");

-- CreateIndex
CREATE INDEX "orders_workspace_id_idx" ON "orders"("workspace_id");

-- CreateIndex
CREATE INDEX "payment_methods_workspace_id_idx" ON "payment_methods"("workspace_id");

-- CreateIndex
CREATE INDEX "price_tables_workspace_id_idx" ON "price_tables"("workspace_id");

-- CreateIndex
CREATE INDEX "product_departments_workspace_id_idx" ON "product_departments"("workspace_id");

-- CreateIndex
CREATE INDEX "product_types_workspace_id_idx" ON "product_types"("workspace_id");

-- CreateIndex
CREATE INDEX "products_workspace_id_idx" ON "products"("workspace_id");

-- CreateIndex
CREATE INDEX "status_templates_workspace_id_idx" ON "status_templates"("workspace_id");

-- CreateIndex
CREATE INDEX "suppliers_workspace_id_idx" ON "suppliers"("workspace_id");

-- CreateIndex
CREATE INDEX "unit_measures_workspace_id_idx" ON "unit_measures"("workspace_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_last_accessed_workspace_id_fkey" FOREIGN KEY ("last_accessed_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_templates" ADD CONSTRAINT "status_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_classifications" ADD CONSTRAINT "client_classifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_measures" ADD CONSTRAINT "unit_measures_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_departments" ADD CONSTRAINT "product_departments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tables" ADD CONSTRAINT "price_tables_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_types" ADD CONSTRAINT "order_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_flows" ADD CONSTRAINT "order_flows_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_models" ADD CONSTRAINT "order_models_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

