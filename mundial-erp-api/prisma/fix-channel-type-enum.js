/**
 * Pre-migration script: converts old ChannelType enum values to new ones.
 *
 * Old values: CHANNEL, DIRECT_MESSAGE
 * New values: PUBLIC, PRIVATE, DIRECT, GROUP_DM
 *
 * Runs BEFORE `prisma db push` so the enum alteration can drop old variants safely.
 * Idempotent — safe to run on every deploy.
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Check if the old enum type and old values still exist
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'CHANNEL'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ChannelType')
      ) AS has_old_values
    `);

    if (rows[0].has_old_values) {
      console.log('Migrating ChannelType enum values...');

      // Add new values to existing enum (IF NOT EXISTS — PG 9.3+)
      await client.query(`ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PUBLIC'`);
      await client.query(`ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PRIVATE'`);
      await client.query(`ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DIRECT'`);
      await client.query(`ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'GROUP_DM'`);

      // Map old values to new values in existing data
      const r1 = await client.query(`UPDATE "chat_channels" SET "type" = 'PUBLIC' WHERE "type" = 'CHANNEL'`);
      const r2 = await client.query(`UPDATE "chat_channels" SET "type" = 'DIRECT' WHERE "type" = 'DIRECT_MESSAGE'`);

      console.log(`Migrated ${r1.rowCount} rows CHANNEL -> PUBLIC, ${r2.rowCount} rows DIRECT_MESSAGE -> DIRECT`);
    } else {
      console.log('ChannelType enum already up to date, skipping');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('ChannelType enum migration failed:', err.message);
  process.exit(1);
});
