const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../finance_assistant.db');
let db = null;

const getDatabase = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      }
    });
  }
  return db;
};

const initDatabase = () => {
  const db = getDatabase();
  
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('resource_coordinator', 'tech_manager', 'consultant', 'user')),
        created_at TEXT DEFAULT (datetime('now', '+8 hours')),
        updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `, (err) => {
      if (err) {
        console.error('用户表创建失败:', err.message);
        return;
      }

      const defaultUsers = [
        { username: 'admin', password: bcrypt.hashSync('123456', 10), role: 'resource_coordinator' },
        { username: 'user1', password: bcrypt.hashSync('123456', 10), role: 'tech_manager' },
        { username: 'user2', password: bcrypt.hashSync('123456', 10), role: 'consultant' }
      ];

      defaultUsers.forEach(user => {
        db.run(
          'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
          [user.username, user.password, user.role],
          (err) => {
            if (err) {
              console.error(`默认用户 ${user.username} 创建失败:`, err.message);
            }
          }
        );
      });
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_by INTEGER NOT NULL,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'in_progress', 'completed', 'suspended', 'cancelled')),
        created_at TEXT DEFAULT (datetime('now', '+8 hours')),
        updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('项目表创建失败:', err.message);
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        project_id INTEGER NOT NULL,
        assigned_to INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        due_date TEXT,
        created_at TEXT DEFAULT (datetime('now', '+8 hours')),
        updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('任务表创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('交易日期索引创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('交易分类索引创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('预算月份索引创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('项目创建人索引创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('任务项目索引创建失败:', err.message);
      }
    });

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('任务分配人索引创建失败:', err.message);
      }
    });
  });

  console.log('数据库初始化完成');
};

const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('数据库关闭失败:', err.message);
      } else {
        console.log('数据库连接已关闭');
      }
    });
    db = null;
  }
};

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};