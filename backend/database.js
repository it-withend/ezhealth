import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(path.join(__dirname, 'health.db'), (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
      }
    });
  }
  return db;
}

export function initDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // Enable foreign keys
    database.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
        reject(err);
        return;
      }

      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          username TEXT,
          photo_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }

        // Health metrics table
        database.run(`
          CREATE TABLE IF NOT EXISTS health_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            value REAL,
            unit TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Error creating health_metrics table:', err);
            reject(err);
            return;
          }

          // Medical analyses table
          database.run(`
            CREATE TABLE IF NOT EXISTS medical_analyses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              type TEXT,
              file_path TEXT,
              file_type TEXT,
              notes TEXT,
              date DATE NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('Error creating medical_analyses table:', err);
              reject(err);
              return;
            }

            // Trusted contacts table
            database.run(`
              CREATE TABLE IF NOT EXISTS trusted_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                contact_telegram_id INTEGER NOT NULL,
                contact_name TEXT,
                can_view_health_data BOOLEAN DEFAULT 1,
                can_receive_alerts BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, contact_telegram_id)
              )
            `, (err) => {
              if (err) {
                console.error('Error creating trusted_contacts table:', err);
                reject(err);
                return;
              }

              // Medications table
              database.run(`
                CREATE TABLE IF NOT EXISTS medications (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  name TEXT NOT NULL,
                  dosage TEXT,
                  frequency TEXT,
                  reminder_time TEXT,
                  is_active BOOLEAN DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
              `, (err) => {
                if (err) {
                  console.error('Error creating medications table:', err);
                  reject(err);
                  return;
                }

                // Medication logs table
                database.run(`
                  CREATE TABLE IF NOT EXISTS medication_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    medication_id INTEGER NOT NULL,
                    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
                  )
                `, (err) => {
                  if (err) {
                    console.error('Error creating medication_logs table:', err);
                    reject(err);
                    return;
                  }

                  // Create indexes
                  database.run(`CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, recorded_at)`, (err) => {
                    if (err) {
                      console.error('Error creating index:', err);
                      reject(err);
                      return;
                    }

                    database.run(`CREATE INDEX IF NOT EXISTS idx_analyses_user_date ON medical_analyses(user_id, date)`, (err) => {
                      if (err) {
                        console.error('Error creating index:', err);
                        reject(err);
                        return;
                      }

                      console.log('Database initialized');
                      resolve();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Promisified database methods
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

