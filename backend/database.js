import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Render, use persistent disk path if available, otherwise use /tmp
const dbPath = process.env.DATABASE_PATH || 
  (process.env.RENDER ? '/tmp/health.db' : path.join(__dirname, 'health.db'));

console.log(`📁 Database path: ${dbPath}`);
console.log(`📁 RENDER env: ${process.env.RENDER || 'not set'}`);
console.log(`📁 DATABASE_PATH env: ${process.env.DATABASE_PATH || 'not set'}`);

let database = null;

// Promisified database methods
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Migration function to add missing columns
async function migrateDatabase() {
  try {
    // Check and add columns to users table
    const userColumns = await dbAll("PRAGMA table_info(users)");
    const userColumnNames = userColumns.map(col => col.name);
    
    const requiredUserColumns = {
      email: 'TEXT',
      phone: 'TEXT',
      date_of_birth: 'TEXT',
      blood_type: 'TEXT',
      allergies: 'TEXT',
      medical_conditions: 'TEXT'
    };

    for (const [columnName, columnType] of Object.entries(requiredUserColumns)) {
      if (!userColumnNames.includes(columnName)) {
        console.log(`📝 Adding column ${columnName} to users table...`);
        await dbRun(`ALTER TABLE users ADD COLUMN ${columnName} ${columnType}`);
      }
    }

    // Check and add source column to health_metrics table
    const metricsColumns = await dbAll("PRAGMA table_info(health_metrics)");
    const metricsColumnNames = metricsColumns.map(col => col.name);
    
    if (!metricsColumnNames.includes('source')) {
      console.log('📝 Adding column source to health_metrics table...');
      await dbRun(`ALTER TABLE health_metrics ADD COLUMN source TEXT DEFAULT 'manual'`);
    }

    console.log('✅ Database migration completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    // Don't fail initialization if migration fails
  }
}

export function initDatabase() {
  return new Promise((resolve, reject) => {
    database = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          username TEXT,
          photo_url TEXT,
          email TEXT,
          phone TEXT,
          date_of_birth TEXT,
          blood_type TEXT,
          allergies TEXT,
          medical_conditions TEXT,
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
            source TEXT DEFAULT 'manual',
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
              type TEXT NOT NULL,
              result TEXT,
              date DATETIME DEFAULT CURRENT_TIMESTAMP,
              notes TEXT,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('Error creating medical_analyses table:', err);
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
                is_active INTEGER DEFAULT 1,
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

                // Habits table
                database.run(`
                  CREATE TABLE IF NOT EXISTS habits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    reminder_time TEXT,
                    frequency TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                  )
                `, (err) => {
                  if (err) {
                    console.error('Error creating habits table:', err);
                    reject(err);
                    return;
                  }

                  // Habit logs table
                  database.run(`
                    CREATE TABLE IF NOT EXISTS habit_logs (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      habit_id INTEGER NOT NULL,
                      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
                    )
                  `, (err) => {
                    if (err) {
                      console.error('Error creating habit_logs table:', err);
                      reject(err);
                      return;
                    }

                    // Trusted contacts table
                    database.run(`
                      CREATE TABLE IF NOT EXISTS trusted_contacts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        contact_telegram_id TEXT NOT NULL,
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

                      // AI chat history table
                      database.run(`
                        CREATE TABLE IF NOT EXISTS ai_chat_history (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          user_id INTEGER NOT NULL,
                          role TEXT NOT NULL,
                          content TEXT NOT NULL,
                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                      `, (err) => {
                        if (err) {
                          console.error('Error creating ai_chat_history table:', err);
                          reject(err);
                          return;
                        }

                        // Health app sync table
                        database.run(`
                          CREATE TABLE IF NOT EXISTS oauth_states (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          state_token TEXT UNIQUE NOT NULL,
                          user_id INTEGER NOT NULL,
                          app_name TEXT NOT NULL,
                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                          expires_at DATETIME NOT NULL,
                          FOREIGN KEY (user_id) REFERENCES users(id)
                        );
                        
                        CREATE TABLE IF NOT EXISTS health_app_sync (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            app_name TEXT NOT NULL,
                            access_token TEXT,
                            refresh_token TEXT,
                            sync_enabled INTEGER DEFAULT 1,
                            last_sync DATETIME,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            UNIQUE(user_id, app_name)
                          )
                        `, async (err) => {
                          if (err) {
                            console.error('Error creating health_app_sync table:', err);
                            reject(err);
                            return;
                          }

                          // Run migrations to add missing columns
                          await migrateDatabase();

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
                              database.run(`CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, is_active)`, (err) => {
                                if (err) {
                                  console.error('Error creating index:', err);
                                  reject(err);
                                  return;
                                }
                                database.run(`CREATE INDEX IF NOT EXISTS idx_ai_chat_user_date ON ai_chat_history(user_id, created_at)`, (err) => {
                                  if (err) {
                                    console.error('Error creating index:', err);
                                    reject(err);
                                    return;
                                  }
                                  database.run(`CREATE INDEX IF NOT EXISTS idx_health_app_sync_user ON health_app_sync(user_id, sync_enabled)`, (err) => {
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
              });
            });
          });
        });
      });
    });
  });
}
