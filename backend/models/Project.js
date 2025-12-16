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

const initProjectTable = () => {
  const db = getDatabase();
  const createTableSQL = `
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
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('项目表创建失败:', err.message);
    }
  });
};

const createProject = (projectData, callback) => {
  const db = getDatabase();
  const { name, description, created_by, start_date, end_date, status } = projectData;
  
  const sql = `
    INSERT INTO projects (name, description, created_by, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(
    sql, 
    [
      name, 
      description || '', 
      created_by, 
      start_date || null, 
      end_date || null, 
      status || 'planning'
    ], 
    function(err) {
      if (err) {
        console.error('创建项目失败:', err.message);
        return callback(err, null);
      }
      callback(null, { id: this.lastID, ...projectData });
    }
  );
};

const getAllProjects = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      p.*,
      u.username as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('查询项目列表失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getProjectById = (id, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      p.*,
      u.username as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('查询项目详情失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

const getProjectsByUser = (userId, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      p.*,
      u.username as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.created_by = ?
    ORDER BY p.created_at DESC
  `;
  
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('查询用户项目失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getProjectsByStatus = (status, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      p.*,
      u.username as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.status = ?
    ORDER BY p.created_at DESC
  `;
  
  db.all(sql, [status], (err, rows) => {
    if (err) {
      console.error('查询指定状态项目失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const updateProject = (id, projectData, callback) => {
  const db = getDatabase();
  const { name, description, start_date, end_date, status } = projectData;
  
  const sql = `
    UPDATE projects
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        updated_at = datetime('now', '+8 hours')
    WHERE id = ?
  `;
  
  db.run(sql, [name, description, start_date, end_date, status, id], function(err) {
    if (err) {
      console.error('更新项目失败:', err.message);
      return callback(err);
    }
    
    if (this.changes === 0) {
      return callback(new Error('项目不存在'));
    }
    
    callback(null, { id, changes: this.changes });
  });
};

const deleteProject = (id, callback) => {
  const db = getDatabase();
  const sql = 'DELETE FROM projects WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('删除项目失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

module.exports = {
  initProjectTable,
  createProject,
  getAllProjects,
  getProjectById,
  getProjectsByUser,
  getProjectsByStatus,
  updateProject,
  deleteProject,
  getDatabase
};