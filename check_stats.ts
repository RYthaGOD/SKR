
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, 'flywheel.db');
const db = new Database(DB_PATH, { readonly: true });

console.log("--- STATS CHECK ---");
const stats = db.prepare('SELECT * FROM stats').all();
stats.forEach((s: any) => console.log(`${s.key}: ${s.value}`));
console.log("-------------------");
