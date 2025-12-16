const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

const initBudgetTable = () => {
  const db = getDatabase();
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      total_budget REAL NOT NULL DEFAULT 0,
      category_id INTEGER,
      category_budget REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
      UNIQUE(month, category_id)
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('预算表创建失败:', err.message);
    }
  });
};

const createBudget = (budgetData, callback) => {
  const db = getDatabase();
  const { month, totalBudget, categoryId, categoryBudget } = budgetData;
  
  const sql = `
    INSERT INTO budgets (month, total_budget, category_id, category_budget, used_amount)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(month, category_id) DO UPDATE SET
      total_budget = excluded.total_budget,
      category_budget = excluded.category_budget,
      updated_at = datetime('now', '+8 hours')
  `;
  
  db.run(sql, [month, totalBudget || 0, categoryId || null, categoryBudget || 0], function(err) {
    if (err) {
      console.error('预算创建失败:', err.message);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, ...budgetData });
  });
};

const getBudgetByMonth = (month, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT b.*, c.name as category_name
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.month = ?
    ORDER BY b.category_id
  `;
  
  db.all(sql, [month], (err, rows) => {
    if (err) {
      console.error('查询预算失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

const updateBudgetUsage = (month, categoryId, amount, callback) => {
  const db = getDatabase();
  const sql = `
    UPDATE budgets
    SET used_amount = used_amount + ?,
        updated_at = datetime('now', '+8 hours')
    WHERE month = ? AND (category_id = ? OR category_id IS NULL)
  `;
  
  db.run(sql, [amount, month, categoryId], function(err) {
    if (err) {
      console.error('更新预算使用情况失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

const deleteBudget = (id, callback) => {
  const db = getDatabase();
  const sql = 'DELETE FROM budgets WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('删除预算失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

const getBudgetAlert = (month, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      b.*,
      c.name as category_name,
      CASE 
        WHEN b.category_budget > 0 THEN (b.used_amount * 100.0 / b.category_budget)
        WHEN b.total_budget > 0 THEN (b.used_amount * 100.0 / b.total_budget)
        ELSE 0
      END as usage_percentage
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.month = ? AND (
      (b.category_budget > 0 AND b.used_amount >= b.category_budget) OR
      (b.total_budget > 0 AND b.used_amount >= b.total_budget)
    )
  `;
  
  db.all(sql, [month], (err, rows) => {
    if (err) {
      console.error('查询预算告警失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

module.exports = {
  initBudgetTable,
  createBudget,
  getBudgetByMonth,
  updateBudgetUsage,
  deleteBudget,
  getBudgetAlert,
  getDatabase
};