CREATE TYPE "NotificationPreferenceType" AS ENUM (
    'TASK_ASSIGNED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'TASK_COMMENT',
    'TASK_STATUS_CHANGE',
    'MENTION',
    'TASK_NAME_CHANGE',
    'TASK_DESCRIPTION_CHANGE',
    'TASK_PRIORITY_CHANGE',
    'TASK_DUE_DATE_CHANGE',
    'TASK_START_DATE_CHANGE',
    'TASK_CUSTOM_FIELD_CHANGE',
    'ACCESS_REQUESTED'
);

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationPreferenceType" NOT NULL,
    "channels" "NotificationChannel"[] DEFAULT ARRAY[]::"NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_user_id_type_key"
    ON "notification_preferences"("user_id", "type");

ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
