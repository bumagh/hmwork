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

const initCategoryTable = () => {
  const db = getDatabase();
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      is_custom INTEGER DEFAULT 0,
      icon TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('分类表创建失败:', err.message);
      return;
    }
    
    const defaultCategories = [
      { name: '餐饮', type: 'expense', icon: '🍜', color: '#F2994A' },
      { name: '交通', type: 'expense', icon: '🚗', color: '#6FCF97' },
      { name: '购物', type: 'expense', icon: '🛍️', color: '#BB6BD9' },
      { name: '娱乐', type: 'expense', icon: '🎮', color: '#56CCF2' },
      { name: '医疗', type: 'expense', icon: '💊', color: '#EB5757' },
      { name: '其他', type: 'expense', icon: '📝', color: '#828282' },
      { name: '工资', type: 'income', icon: '💰', color: '#27AE60' },
      { name: '兼职', type: 'income', icon: '💼', color: '#6FCF97' },
      { name: '投资', type: 'income', icon: '📈', color: '#2D9CDB' },
      { name: '其他收入', type: 'income', icon: '💵', color: '#219653' }
    ];
    
    const insertSQL = `
      INSERT OR IGNORE INTO categories (name, type, is_custom, icon, color)
      VALUES (?, ?, 0, ?, ?)
    `;
    
    defaultCategories.forEach(category => {
      db.run(insertSQL, [category.name, category.type, category.icon, category.color], (err) => {
        if (err) {
          console.error('预设分类插入失败:', err.message);
        }
      });
    });
  });
};

const getAllCategories = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT * FROM categories 
    ORDER BY is_custom ASC, type DESC, id ASC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('查询分类失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

const getCategoriesByType = (type, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT * FROM categories 
    WHERE type = ?
    ORDER BY is_custom ASC, id ASC
  `;
  
  db.all(sql, [type], (err, rows) => {
    if (err) {
      console.error('按类型查询分类失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

const createCategory = (categoryData, callback) => {
  const db = getDatabase();
  const { name, type, icon, color } = categoryData;
  
  const sql = `
    INSERT INTO categories (name, type, is_custom, icon, color)
    VALUES (?, ?, 1, ?, ?)
  `;
  
  db.run(sql, [name, type, icon || '📌', color || '#828282'], function(err) {
    if (err) {
      console.error('创建自定义分类失败:', err.message);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, ...categoryData, is_custom: 1 });
  });
};

const updateCategory = (id, categoryData, callback) => {
  const db = getDatabase();
  const { name, icon, color } = categoryData;
  
  const sql = `
    UPDATE categories
    SET name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        updated_at = datetime('now', '+8 hours')
    WHERE id = ? AND is_custom = 1
  `;
  
  db.run(sql, [name, icon, color, id], function(err) {
    if (err) {
      console.error('更新分类失败:', err.message);
      return callback(err);
    }
    
    if (this.changes === 0) {
      return callback(new Error('分类不存在或不可编辑'));
    }
    
    callback(null, { id, changes: this.changes });
  });
};

const deleteCategory = (id, callback) => {
  const db = getDatabase();
  
  db.get('SELECT is_custom FROM categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('查询分类失败:', err.message);
      return callback(err);
    }
    
    if (!row) {
      return callback(new Error('分类不存在'));
    }
    
    if (row.is_custom === 0) {
      return callback(new Error('预设分类不可删除'));
    }
    
    const sql = 'DELETE FROM categories WHERE id = ? AND is_custom = 1';
    
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('删除分类失败:', err.message);
        return callback(err);
      }
      callback(null, { changes: this.changes });
    });
  });
};

const getCategoryById = (id, callback) => {
  const db = getDatabase();
  const sql = 'SELECT * FROM categories WHERE id = ?';
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('查询分类详情失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

module.exports = {
  initCategoryTable,
  getAllCategories,
  getCategoriesByType,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getDatabase
};