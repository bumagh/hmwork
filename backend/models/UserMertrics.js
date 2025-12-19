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

// 在 user.js 中添加指标表初始化
const initMetricsTable = () => {
  const db = getDatabase();

  // 主指标表
  const createMetricsTableSQL = `
    CREATE TABLE IF NOT EXISTS user_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value INTEGER DEFAULT 0,
      metric_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, metric_type, metric_date)
    )
  `;

  // 指标类型定义表（可选，用于管理指标元数据）
  const createMetricTypesTableSQL = `
    CREATE TABLE IF NOT EXISTS metric_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      unit TEXT,
      is_accumulative BOOLEAN DEFAULT 1, -- 是否累加类型（如次数），0为覆盖类型（如状态）
      default_value INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `;

  db.serialize(() => {
    db.run(createMetricsTableSQL, (err) => {
      if (err) {
        console.error('用户指标表创建失败:', err.message);
      } else {
        console.log('用户指标表创建成功');

        // 预定义一些常用指标类型
        const defaultMetrics = [
          ['app_open', '小程序打开次数', '用户打开小程序应用的次数', '次', 1, 0],
          ['task_complete', '完成任务数', '用户完成任务的数量', '个', 1, 0],
          ['task_submit', '任务提交数', '用户提交任务的数量', '个', 1, 0],
          ['task_review_pass', '任务审核通过数', '任务审核通过的数量', '个', 1, 0],
          ['task_review_fail', '任务审核失败数', '任务审核失败的数量', '个', 1, 0],
          ['login_count', '登录次数', '用户登录系统的次数', '次', 1, 0],
          ['online_duration', '在线时长', '用户在线时长', '分钟', 1, 0],
          ['last_active', '最后活跃状态', '用户最后活跃状态', '状态值', 0, 0]
        ];

        const insertSQL = `
          INSERT OR IGNORE INTO metric_types 
          (metric_key, display_name, description, unit, is_accumulative, default_value)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        defaultMetrics.forEach(metric => {
          db.run(insertSQL, metric, (err) => {
            if (err) console.error('插入指标类型失败:', err.message);
          });
        });
      }
    });

    db.run(createMetricTypesTableSQL, (err) => {
      if (err) {
        console.error('指标类型表创建失败:', err.message);
      }
    });
  });
};
// 记录用户指标（累加类型）
const recordMetric = (userId, metricType, value = 1, date = null, callback) => {
  const db = getDatabase();
  const metricDate = date || new Date().toISOString().split('T')[0];

  // 检查指标类型是否为累加类型
  const checkMetricSQL = `
    SELECT is_accumulative FROM metric_types WHERE metric_key = ?
  `;

  db.get(checkMetricSQL, [metricType], (err, metricTypeInfo) => {
    if (err) {
      console.error('查询指标类型失败:', err.message);
      return callback(err);
    }

    const isAccumulative = metricTypeInfo ? metricTypeInfo.is_accumulative : 1;

    // 先检查今天是否有记录
    const checkSQL = `
      SELECT id, metric_value FROM user_metrics 
      WHERE user_id = ? AND metric_type = ? AND metric_date = ?
    `;

    db.get(checkSQL, [userId, metricType, metricDate], (err, row) => {
      if (err) {
        console.error('检查指标记录失败:', err.message);
        return callback(err);
      }

      if (row) {
        // 更新现有记录
        let newValue;
        let updateSQL;

        if (isAccumulative) {
          newValue = row.metric_value + value;
          updateSQL = `
            UPDATE user_metrics 
            SET metric_value = metric_value + ?,
                updated_at = datetime('now', '+8 hours')
            WHERE id = ?
          `;
        } else {
          newValue = value; // 覆盖类型
          updateSQL = `
            UPDATE user_metrics 
            SET metric_value = ?,
                updated_at = datetime('now', '+8 hours')
            WHERE id = ?
          `;
        }

        db.run(updateSQL, isAccumulative ? [value, row.id] : [value, row.id], function (err) {
          if (err) {
            console.error('更新指标失败:', err.message);
            return callback(err);
          }
          callback(null, {
            id: row.id,
            oldValue: row.metric_value,
            newValue,
            changes: this.changes
          });
        });
      } else {
        // 创建新记录
        const insertSQL = `
          INSERT INTO user_metrics (user_id, metric_type, metric_value, metric_date)
          VALUES (?, ?, ?, ?)
        `;

        db.run(insertSQL, [userId, metricType, value, metricDate], function (err) {
          if (err) {
            console.error('创建指标记录失败:', err.message);
            return callback(err);
          }
          callback(null, {
            id: this.lastID,
            metricValue: value
          });
        });
      }
    });
  });
};

// 批量记录指标
const recordMetricsBatch = (metrics, callback) => {
  const db = getDatabase();

  db.serialize(() => {
    const results = [];
    let completed = 0;

    metrics.forEach((metric, index) => {
      const { userId, metricType, value = 1, date } = metric;

      recordMetric(userId, metricType, value, date, (err, result) => {
        if (err) {
          console.error(`记录指标 ${metricType} 失败:`, err.message);
        }

        results[index] = { metric, result, error: err };
        completed++;

        if (completed === metrics.length) {
          callback(null, results);
        }
      });
    });
  });
};

// 获取用户特定指标数据
const getUserMetrics = (userId, options = {}, callback) => {
  const db = getDatabase();
  const {
    metricTypes,          // 指标类型数组，如 ['app_open', 'task_complete']
    startDate,
    endDate,
    groupBy = 'day',     // day, week, month, year
    limit = 30
  } = options;

  let whereClause = 'WHERE user_id = ?';
  let params = [userId];

  if (metricTypes && metricTypes.length > 0) {
    const placeholders = metricTypes.map(() => '?').join(',');
    whereClause += ` AND metric_type IN (${placeholders})`;
    params = params.concat(metricTypes);
  }

  if (startDate) {
    whereClause += ' AND metric_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND metric_date <= ?';
    params.push(endDate);
  }

  let dateFormat;
  switch (groupBy) {
    case 'week':
      dateFormat = "strftime('%Y-%W', metric_date)";
      break;
    case 'month':
      dateFormat = "strftime('%Y-%m', metric_date)";
      break;
    case 'year':
      dateFormat = "strftime('%Y', metric_date)";
      break;
    default: // day
      dateFormat = 'metric_date';
  }

  // 获取按时间分组的统计数据
  const sql = `
    SELECT 
      ${dateFormat} as period,
      metric_type,
      SUM(metric_value) as total_value,
      COUNT(*) as record_count
    FROM user_metrics
    ${whereClause}
    GROUP BY period, metric_type
    ORDER BY period DESC
    LIMIT ?
  `;

  params.push(limit);

  db.all(sql, params, (err, groupedRows) => {
    if (err) {
      console.error('获取分组指标失败:', err.message);
      return callback(err, null);
    }

    // 获取今日各项指标
    const todaySQL = `
      SELECT metric_type, metric_value
      FROM user_metrics 
      WHERE user_id = ? AND metric_date = date('now')
      ${metricTypes && metricTypes.length > 0 ? `AND metric_type IN (${metricTypes.map(() => '?').join(',')})` : ''}
    `;

    const todayParams = [userId];
    if (metricTypes && metricTypes.length > 0) {
      todayParams.push(...metricTypes);
    }

    db.all(todaySQL, todayParams, (todayErr, todayRows) => {
      const todayData = {};
      if (!todayErr && todayRows) {
        todayRows.forEach(row => {
          todayData[row.metric_type] = row.metric_value;
        });
      }

      // 获取总计
      const totalSQL = `
        SELECT 
          metric_type,
          SUM(metric_value) as total_value
        FROM user_metrics
        WHERE user_id = ?
        ${metricTypes && metricTypes.length > 0 ? `AND metric_type IN (${metricTypes.map(() => '?').join(',')})` : ''}
        GROUP BY metric_type
      `;

      const totalParams = [userId];
      if (metricTypes && metricTypes.length > 0) {
        totalParams.push(...metricTypes);
      }

      db.all(totalSQL, totalParams, (totalErr, totalRows) => {
        const totalData = {};
        if (!totalErr && totalRows) {
          totalRows.forEach(row => {
            totalData[row.metric_type] = row.total_value;
          });
        }

        // 按指标类型整理分组数据
        const groupedByMetric = {};
        if (groupedRows) {
          groupedRows.forEach(row => {
            if (!groupedByMetric[row.metric_type]) {
              groupedByMetric[row.metric_type] = [];
            }
            groupedByMetric[row.metric_type].push({
              period: row.period,
              value: row.total_value,
              recordCount: row.record_count
            });
          });
        }

        const result = {
          today: todayData,
          total: totalData,
          history: groupedByMetric,
          summary: groupedRows
        };

        callback(null, result);
      });
    });
  });
};

// 获取多个用户的指标对比
const getUsersMetricsComparison = (userIds, metricTypes, options = {}, callback) => {
  const db = getDatabase();
  const {
    startDate,
    endDate,
    limit = 50
  } = options;

  const userPlaceholders = userIds.map(() => '?').join(',');
  const metricPlaceholders = metricTypes.map(() => '?').join(',');

  let whereClause = `WHERE user_id IN (${userPlaceholders}) AND metric_type IN (${metricPlaceholders})`;
  let params = [...userIds, ...metricTypes];

  if (startDate) {
    whereClause += ' AND metric_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND metric_date <= ?';
    params.push(endDate);
  }

  const sql = `
    SELECT 
      u.id as user_id,
      u.username,
      um.metric_type,
      SUM(um.metric_value) as total_value,
      COUNT(DISTINCT um.metric_date) as active_days,
      MAX(um.metric_date) as last_record_date
    FROM user_metrics um
    LEFT JOIN users u ON um.user_id = u.id
    ${whereClause}
    GROUP BY u.id, u.username, um.metric_type
    ORDER BY total_value DESC
    LIMIT ?
  `;

  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('获取用户指标对比失败:', err.message);
      return callback(err, null);
    }

    // 按用户组织数据
    const result = {};
    rows.forEach(row => {
      if (!result[row.user_id]) {
        result[row.user_id] = {
          userId: row.user_id,
          username: row.username,
          metrics: {}
        };
      }
      result[row.user_id].metrics[row.metric_type] = {
        totalValue: row.total_value,
        activeDays: row.active_days,
        lastRecordDate: row.last_record_date
      };
    });

    callback(null, Object.values(result));
  });
};

// 获取指标类型列表
const getMetricTypes = (callback) => {
  const db = getDatabase();
  const sql = `
    SELECT id, metric_key, display_name, description, unit, is_accumulative, default_value, created_at
    FROM metric_types
    ORDER BY created_at ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('获取指标类型失败:', err.message);
      return callback(err, null);
    }
    callback(null, rows || []);
  });
};

// 添加新的指标类型
const addMetricType = (metricData, callback) => {
  const db = getDatabase();
  const { metric_key, display_name, description, unit, is_accumulative = 1, default_value = 0 } = metricData;

  const sql = `
    INSERT INTO metric_types (metric_key, display_name, description, unit, is_accumulative, default_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [metric_key, display_name, description, unit, is_accumulative, default_value], function (err) {
    if (err) {
      console.error('添加指标类型失败:', err.message);
      return callback(err);
    }
    callback(null, { id: this.lastID, ...metricData });
  });
};

// 获取用户的综合得分（可自定义权重）
const getUserScore = (userId, weightConfig = {}, options = {}, callback) => {
  const db = getDatabase();
  const {
    startDate,
    endDate
  } = options;

  // 默认权重配置
  const defaultWeights = {
    'app_open': 0.1,
    'task_complete': 0.5,
    'task_review_pass': 0.4
  };

  const weights = { ...defaultWeights, ...weightConfig };
  const metricTypes = Object.keys(weights);

  const placeholders = metricTypes.map(() => '?').join(',');
  let whereClause = `WHERE user_id = ? AND metric_type IN (${placeholders})`;
  let params = [userId, ...metricTypes];

  if (startDate) {
    whereClause += ' AND metric_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND metric_date <= ?';
    params.push(endDate);
  }

  const sql = `
    SELECT 
      metric_type,
      SUM(metric_value) as total_value
    FROM user_metrics
    ${whereClause}
    GROUP BY metric_type
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('获取用户指标值失败:', err.message);
      return callback(err, null);
    }

    // 计算加权得分
    let totalScore = 0;
    const metricDetails = {};

    rows.forEach(row => {
      const weight = weights[row.metric_type] || 0;
      const weightedValue = row.total_value * weight;
      totalScore += weightedValue;

      metricDetails[row.metric_type] = {
        value: row.total_value,
        weight: weight,
        weightedValue: weightedValue
      };
    });

    callback(null, {
      userId,
      totalScore: Math.round(totalScore),
      metricDetails,
      weights
    });
  });
};

// 为了兼容旧代码，保留原函数名但修改实现
const recordAppOpen = (userId, callback) => {
  recordMetric(userId, 'app_open', 1, null, callback);
};

const recordTaskComplete = (userId, taskCount = 1, callback) => {
  recordMetric(userId, 'task_complete', taskCount, null, callback);
};

// 兼容旧的统计函数
const getUserStatistics = (userId, options = {}, callback) => {
  const metricTypes = ['app_open', 'task_complete'];
  getUserMetrics(userId, { ...options, metricTypes }, callback);
};

const getAllStatistics = (options = {}, callback) => {
  const db = getDatabase();
  const {
    startDate,
    endDate,
    role,
    limit = 100
  } = options;

  let whereClause = 'WHERE 1=1';
  let params = [];

  if (startDate) {
    whereClause += ' AND um.metric_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND um.metric_date <= ?';
    params.push(endDate);
  }

  let joinClause = 'LEFT JOIN users u ON um.user_id = u.id';

  if (role) {
    whereClause += ' AND u.role = ?';
    params.push(role);
  }

  // 获取每个用户的主要指标
  const sql = `
    SELECT 
      u.id as user_id,
      u.username,
      u.role,
      SUM(CASE WHEN um.metric_type = 'app_open' THEN um.metric_value ELSE 0 END) as total_app_opens,
      SUM(CASE WHEN um.metric_type = 'task_complete' THEN um.metric_value ELSE 0 END) as total_task_completes,
      SUM(CASE WHEN um.metric_type = 'login_count' THEN um.metric_value ELSE 0 END) as total_logins,
      COUNT(DISTINCT um.metric_date) as active_days,
      MAX(um.metric_date) as last_active_date
    FROM user_metrics um
    ${joinClause}
    ${whereClause}
    GROUP BY u.id, u.username, u.role
    ORDER BY total_task_completes DESC, total_app_opens DESC
    LIMIT ?
  `;

  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('获取所有统计信息失败:', err.message);
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
  // 新的指标统计函数
  initMetricsTable,
  recordMetric,
  recordMetricsBatch,
  getUserMetrics,
  getUsersMetricsComparison,
  getMetricTypes,
  addMetricType,
  getUserScore,

  // 兼容旧接口的函数
  recordAppOpen,
  recordTaskComplete,
  getUserStatistics,
  getAllStatistics
};