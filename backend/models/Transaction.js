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

const initTransactionTable = () => {
  const db = getDatabase();
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('交易表创建失败:', err.message);
    }
  });
};

const createTransaction = (transactionData, callback) => {
  const db = getDatabase();
  const { amount, type, categoryId, date, note } = transactionData;
  
  const sql = `
    INSERT INTO transactions (amount, type, category_id, date, note)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [amount, type, categoryId, date, note || ''], function(err) {
    if (err) {
      console.error('创建交易记录失败:', err.message);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, ...transactionData });
  });
};

const getAllTransactions = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('查询交易记录失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getTransactionById = (id, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('查询交易详情失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

const updateTransaction = (id, transactionData, callback) => {
  const db = getDatabase();
  const { amount, type, categoryId, date, note } = transactionData;
  
  const sql = `
    UPDATE transactions
    SET amount = COALESCE(?, amount),
        type = COALESCE(?, type),
        category_id = COALESCE(?, category_id),
        date = COALESCE(?, date),
        note = COALESCE(?, note),
        updated_at = datetime('now', '+8 hours')
    WHERE id = ?
  `;
  
  db.run(sql, [amount, type, categoryId, date, note, id], function(err) {
    if (err) {
      console.error('更新交易记录失败:', err.message);
      return callback(err);
    }
    
    if (this.changes === 0) {
      return callback(new Error('交易记录不存在'));
    }
    
    callback(null, { id, changes: this.changes });
  });
};

const deleteTransaction = (id, callback) => {
  const db = getDatabase();
  const sql = 'DELETE FROM transactions WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('删除交易记录失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

const getTransactionsByDateRange = (startDate, endDate, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date BETWEEN ? AND ?
    ORDER BY t.date DESC, t.created_at DESC
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) {
      console.error('按日期范围查询失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getTransactionsByMonth = (year, month, callback) => {
  const db = getDatabase();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  
  const sql = `
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date < ?
    ORDER BY t.date DESC, t.created_at DESC
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) {
      console.error('按月份查询失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getCategoryStatistics = (startDate, endDate, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      c.id,
      c.name,
      c.type,
      c.icon,
      c.color,
      COALESCE(SUM(t.amount), 0) as total_amount,
      COUNT(t.id) as transaction_count
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id 
      AND t.date BETWEEN ? AND ?
    GROUP BY c.id, c.name, c.type, c.icon, c.color
    ORDER BY total_amount DESC
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) {
      console.error('查询分类统计失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

module.exports = {
  initTransactionTable,
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionsByDateRange,
  getTransactionsByMonth,
  getCategoryStatistics,
  getDatabase
};