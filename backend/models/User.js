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

const initUserTable = () => {
  const db = getDatabase();
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('resource_coordinator', 'tech_manager', 'consultant', 'user')),
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('用户表创建失败:', err.message);
    }
  });
};

const createUser = (userData, callback) => {
  const db = getDatabase();
  const { username, password, role } = userData;

  const sql = `
    INSERT INTO users (username, password, role)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [username, password, role || 'user'], function (err) {
    if (err) {
      console.error('创建用户失败:', err.message);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, ...userData });
  });
};


// 获取所有用户（带分页）
const queryAllUsers = (query, params, callback) => {
  db.all(query, params, (err, results) => {
    if (err) return callback(err);
    callback(null, results);
  });
};

// 获取用户总数
const getTotalUsers = (whereClause, params, callback) => {
  const db = getDatabase();

  const query = `SELECT COUNT(*) as total FROM users ${whereClause}`;

  db.all(query, params, (err, results) => {
    if (err) return callback(err);
    callback(null, { total: results[0]?.total || 0 });
  });
};

const getAllUsers = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('查询用户列表失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};
const getUserById = (id, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, role, created_at, updated_at
    FROM users
    WHERE id = ?
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('查询用户详情失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

const getUserByUsername = (username, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, password, role, created_at, updated_at
    FROM users
    WHERE username = ?
  `;

  db.get(sql, [username], (err, row) => {
    if (err) {
      console.error('按用户名查询失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

const updateUser = (id, userData, callback) => {
  const db = getDatabase();
  const { username, password, role } = userData;

  const sql = `
    UPDATE users
    SET username = COALESCE(?, username),
        password = COALESCE(?, password),
        role = COALESCE(?, role),
        updated_at = datetime('now', '+8 hours')
    WHERE id = ?
  `;

  db.run(sql, [username, password, role, id], function (err) {
    if (err) {
      console.error('更新用户失败:', err.message);
      return callback(err);
    }

    if (this.changes === 0) {
      return callback(new Error('用户不存在'));
    }

    callback(null, { id, changes: this.changes });
  });
};

const deleteUser = (id, callback) => {
  const db = getDatabase();
  const sql = 'DELETE FROM users WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('删除用户失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

const getUsersByRole = (role, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, role, created_at, updated_at
    FROM users
    WHERE role = ?
    ORDER BY created_at DESC
  `;

  db.all(sql, [role], (err, rows) => {
    if (err) {
      console.error('按角色查询用户失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const validateCredentials = (username, password, callback) => {
  getUserByUsername(username, (err, user) => {
    if (err) {
      return callback(err, null);
    }

    if (!user) {
      return callback(null, { valid: false, message: '用户不存在' });
    }

    if (user.password !== password) {
      return callback(null, { valid: false, message: '密码错误' });
    }

    callback(null, {
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
};

module.exports = {
  initUserTable,
  createUser,
  getAllUsers,
  getUserById,
  getUserByUsername,
  updateUser,
  deleteUser,
  getUsersByRole,
  validateCredentials,
  getDatabase,
  queryAllUsers,
  getTotalUsers
};