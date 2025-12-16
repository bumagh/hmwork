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

const initTaskTable = () => {
  const db = getDatabase();
  const createTableSQL = `
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
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('任务表创建失败:', err.message);
    }
  });
};

const createTask = (taskData, callback) => {
  const db = getDatabase();
  const { name, description, project_id, assigned_to, status, priority, due_date } = taskData;
  
  const sql = `
    INSERT INTO tasks (name, description, project_id, assigned_to, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(
    sql, 
    [
      name, 
      description || '', 
      project_id, 
      assigned_to, 
      status || 'pending', 
      priority || 'medium', 
      due_date || null
    ], 
    function(err) {
      if (err) {
        console.error('创建任务失败:', err.message);
        return callback(err, null);
      }
      callback(null, { id: this.lastID, ...taskData });
    }
  );
};

const getAllTasks = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      p.name as project_name,
      u.username as assigned_user_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    ORDER BY t.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('查询任务列表失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getTaskById = (id, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      p.name as project_name,
      u.username as assigned_user_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.id = ?
  `;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('查询任务详情失败:', err.message);
      return callback(err, null);
    }
    callback(null, row);
  });
};

const getTasksByProject = (projectId, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      p.name as project_name,
      u.username as assigned_user_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `;
  
  db.all(sql, [projectId], (err, rows) => {
    if (err) {
      console.error('查询项目任务失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getTasksByUser = (userId, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      p.name as project_name,
      u.username as assigned_user_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.assigned_to = ?
    ORDER BY t.created_at DESC
  `;
  
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('查询用户任务失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const getTasksByStatus = (status, callback) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      t.*,
      p.name as project_name,
      u.username as assigned_user_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.status = ?
    ORDER BY t.created_at DESC
  `;
  
  db.all(sql, [status], (err, rows) => {
    if (err) {
      console.error('查询指定状态任务失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

const updateTask = (id, taskData, callback) => {
  const db = getDatabase();
  const { name, description, assigned_to, status, priority, due_date } = taskData;
  
  const sql = `
    UPDATE tasks
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        assigned_to = COALESCE(?, assigned_to),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        updated_at = datetime('now', '+8 hours')
    WHERE id = ?
  `;
  
  db.run(sql, [name, description, assigned_to, status, priority, due_date, id], function(err) {
    if (err) {
      console.error('更新任务失败:', err.message);
      return callback(err);
    }
    
    if (this.changes === 0) {
      return callback(new Error('任务不存在'));
    }
    
    callback(null, { id, changes: this.changes });
  });
};

const deleteTask = (id, callback) => {
  const db = getDatabase();
  const sql = 'DELETE FROM tasks WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('删除任务失败:', err.message);
      return callback(err);
    }
    callback(null, { changes: this.changes });
  });
};

module.exports = {
  initTaskTable,
  createTask,
  getAllTasks,
  getTaskById,
  getTasksByProject,
  getTasksByUser,
  getTasksByStatus,
  updateTask,
  deleteTask,
  getDatabase
};