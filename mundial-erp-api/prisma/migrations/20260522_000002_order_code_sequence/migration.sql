CREATE TABLE "order_code_sequences" (
    "workspace_id" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_code_sequences_pkey" PRIMARY KEY ("workspace_id")
);
