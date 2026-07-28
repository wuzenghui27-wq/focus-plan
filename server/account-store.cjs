const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function createAccountStore(databasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_snapshots (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return {
    savePhoneCode(phone, codeHash, expiresAt) {
      database.prepare(`
        INSERT INTO phone_codes (phone, code_hash, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET
          code_hash = excluded.code_hash, expires_at = excluded.expires_at
      `).run(phone, codeHash, expiresAt);
    },
    consumePhoneCode(phone, codeHash, now) {
      const record = database.prepare(
        "SELECT code_hash, expires_at FROM phone_codes WHERE phone = ?"
      ).get(phone);
      if (!record || record.expires_at < now || record.code_hash !== codeHash) {
        return false;
      }
      database.prepare("DELETE FROM phone_codes WHERE phone = ?").run(phone);
      return true;
    },
    getOrCreateUser(phone, createdAt) {
      database.prepare(`
        INSERT INTO users (phone, created_at) VALUES (?, ?)
        ON CONFLICT(phone) DO NOTHING
      `).run(phone, createdAt);
      return database.prepare(
        "SELECT id, phone, created_at FROM users WHERE phone = ?"
      ).get(phone);
    },
    createSession(tokenHash, userId, expiresAt) {
      database.prepare(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
      ).run(tokenHash, userId, expiresAt);
    },
    getUserBySession(tokenHash, now) {
      return database.prepare(`
        SELECT users.id, users.phone, users.created_at
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at >= ?
      `).get(tokenHash, now) || null;
    },
    deleteSession(tokenHash) {
      database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    },
    getSnapshot(userId) {
      const record = database.prepare(
        "SELECT payload FROM sync_snapshots WHERE user_id = ?"
      ).get(userId);
      return record ? JSON.parse(record.payload) : null;
    },
    saveSnapshot(userId, snapshot) {
      database.prepare(`
        INSERT INTO sync_snapshots (user_id, payload, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          payload = excluded.payload, updated_at = excluded.updated_at
      `).run(userId, JSON.stringify(snapshot), snapshot.updatedAt);
    },
    close() {
      database.close();
    }
  };
}

module.exports = { createAccountStore };
