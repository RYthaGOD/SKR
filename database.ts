
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, 'flywheel.db');
const db = new Database(DB_PATH);

// Initialize Tables
export function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS stats (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            message TEXT
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            isgPrice REAL,
            skrPrice REAL,
            vaultSol REAL
        );
    `);
}

// Stats Helpers (Key-Value Store style for simple props)
export function saveStat(key: string, value: any) {
    const stmt = db.prepare('INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)');
    stmt.run(key, JSON.stringify(value));
}

export function loadStat(key: string, defaultValue: any) {
    const stmt = db.prepare('SELECT value FROM stats WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : defaultValue;
}

// Logs Helpers
export function addLog(message: string) {
    const stmt = db.prepare('INSERT INTO logs (message) VALUES (?)');
    stmt.run(message);

    // Auto-prune old logs (keep last 1000)
    db.exec('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 1000)');
}

export function getRecentLogs(limit = 50): string[] {
    const stmt = db.prepare('SELECT message FROM logs ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(limit) as { message: string }[];
    return rows.map(r => r.message); // Timestamps are embedded in msg string usually, or we can format here
}

// History Helpers
export function addHistoryPoint(timestamp: number, isg: number, skr: number, sol: number) {
    const stmt = db.prepare('INSERT INTO history (timestamp, isgPrice, skrPrice, vaultSol) VALUES (?, ?, ?, ?)');
    stmt.run(timestamp, isg, skr, sol);

    // Prune old history (keep last 1000 points?) ~ 3-4 days at 5min interval
    // 5 mins * 12 * 24 = 288 points/day. 1000 is fine.
    db.exec('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 1000)');
}

export function getHistory(limit = 24) {
    const stmt = db.prepare('SELECT * FROM history ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return {
        isgPrice: rows.map(r => r.isgPrice).reverse(),
        skrPrice: rows.map(r => r.skrPrice).reverse(),
        vaultSol: rows.map(r => r.vaultSol).reverse()
    };
}
