import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('Prisma migrations', () => {
  it('apply sequentially to an empty PostgreSQL database', async () => {
    const database = new PGlite();
    const migrationsDirectory = path.resolve(process.cwd(), 'prisma', 'migrations');

    try {
      const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });
      const migrationDirectories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      for (const directory of migrationDirectories) {
        const sql = await fs.readFile(
          path.join(migrationsDirectory, directory, 'migration.sql'),
          'utf8'
        );
        await database.exec(sql);
      }

      const tables = await database.query<{ table_name: string }>(
        `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public'`
      );
      const tableNames = new Set(tables.rows.map((row) => row.table_name));
      for (const tableName of [
        'users',
        'user_profiles',
        'vehicles',
        'bookings',
        'payments',
        'pricings',
        'support_tickets',
        'activity_logs'
      ]) {
        expect(tableNames.has(tableName)).toBe(true);
      }

      const distanceColumn = await database.query<{ data_type: string }>(
        `SELECT data_type
             FROM information_schema.columns
            WHERE table_name = 'drop_off_charges' AND column_name = 'distanceKm'`
      );
      expect(distanceColumn.rows).toHaveLength(1);
      expect(distanceColumn.rows[0]?.data_type).toBe('numeric');

      const checkoutColumns = await database.query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name IN ('checkoutSessionId', 'checkoutExpiresAt')`
      );
      expect(checkoutColumns.rows.map((row) => row.column_name).sort()).toEqual([
        'checkoutExpiresAt',
        'checkoutSessionId'
      ]);
    } finally {
      await database.close();
    }
  }, 30_000);
});
