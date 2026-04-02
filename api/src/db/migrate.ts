import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase } from './database';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function migrate(): void {
  const db = getDatabase();

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get already-applied migrations
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((row: any) => row.name)
  );

  // Read and apply pending migrations in order
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`  Applying: ${file}`);

    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  }

  console.log('Migrations complete.');
  closeDatabase();
}

migrate();
