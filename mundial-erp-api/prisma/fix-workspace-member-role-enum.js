/**
 * Pre-migration script: renames old WorkspaceMemberRole enum value.
 *
 * Old values: OWNER, ADMIN, MEMBER, GUEST
 * New values: OWNER, ADMIN, EDITOR, GUEST
 *
 * Runs BEFORE `prisma db push` so the enum alteration does not fail on rows
 * (and column defaults) still using the old `MEMBER` label.
 * Idempotent — safe to run on every deploy.
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'MEMBER'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkspaceMemberRole')
      ) AS has_old_value
    `);

    if (rows[0].has_old_value) {
      console.log('Renaming WorkspaceMemberRole MEMBER -> EDITOR...');
      await client.query(
        `ALTER TYPE "WorkspaceMemberRole" RENAME VALUE 'MEMBER' TO 'EDITOR'`,
      );
      console.log('WorkspaceMemberRole enum migrated');
    } else {
      console.log('WorkspaceMemberRole enum already up to date, skipping');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('WorkspaceMemberRole enum migration failed:', err.message);
  process.exit(1);
});
