const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userDB = require('../models/UserMertrics');
const winston = require('winston');
// 初始化统计表

// 记录打开小程序
router.post('/app-open', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: '用户ID不能为空' });
    }

    userDB.recordAppOpen(userId, (err, result) => {
        if (err) {
            return res.status(500).json({ error: '记录失败', details: err.message });
        }
        res.json({
            success: true,
            message: '打开次数已记录',
            data: result
        });
    });
});

// 记录完成任务
router.post('/task-complete', (req, res) => {
    const { userId, taskCount = 1 } = req.body;

    if (!userId) {
        return res.status(400).json({ error: '用户ID不能为空' });
    }

    userDB.recordTaskComplete(userId, taskCount, (err, result) => {
        if (err) {
            return res.status(500).json({ error: '记录失败', details: err.message });
        }
        res.json({
            success: true,
            message: '任务完成次数已记录',
            data: result
        });
    });
});

// 获取个人统计数据
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const {
        startDate,
        endDate,
        groupBy = 'day'
    } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (groupBy) options.groupBy = groupBy;

    userDB.getUserStatistics(userId, options, (err, data) => {
        if (err) {
            return res.status(500).json({ error: '获取统计失败', details: err.message });
        }
        res.json({ success: true, data });
    });
});

// 获取所有员工统计数据（需要管理员权限）
router.get('/all', (req, res) => {
    // 这里可以添加权限验证
    const {
        startDate,
        endDate,
        role,
        limit = 100
    } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (role) options.role = role;
    options.limit = parseInt(limit);

    userDB.getAllStatistics(options, (err, data) => {
        if (err) {
            return res.status(500).json({ error: '获取统计失败', details: err.message });
        }
        res.json({ success: true, data });
    });
});

// 获取统计数据仪表板
router.get('/dashboard', (req, res) => {
    const db = userDB.getDatabase();

    // 获取今日活跃用户数
    const todaySql = `
    SELECT COUNT(DISTINCT user_id) as today_active_users
    FROM user_statistics 
    WHERE date = date('now')
  `;

    // 获取今日完成任务总数
    const todayTaskSql = `
    SELECT SUM(task_complete_count) as today_total_tasks
    FROM user_statistics 
    WHERE date = date('now')
  `;

    // 获取近7天数据
    const weeklySql = `
    SELECT 
      date,
      SUM(app_open_count) as daily_opens,
      SUM(task_complete_count) as daily_tasks
    FROM user_statistics 
    WHERE date >= date('now', '-7 days')
    GROUP BY date
    ORDER BY date DESC
  `;

    db.serialize(() => {
        let result = {};

        db.get(todaySql, [], (err, row) => {
            if (!err && row) {
                result.today_active_users = row.today_active_users || 0;
            }
        });

        db.get(todayTaskSql, [], (err, row) => {
            if (!err && row) {
                result.today_total_tasks = row.today_total_tasks || 0;
            }
        });

        db.all(weeklySql, [], (err, rows) => {
            if (!err) {
                result.weekly_data = rows || [];
            }

            // 获取员工排名
            const rankSql = `
        SELECT 
          u.username,
          SUM(us.task_complete_count) as total_tasks,
          SUM(us.app_open_count) as total_opens
        FROM user_statistics us
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.date >= date('now', '-30 days')
        GROUP BY u.id
        ORDER BY total_tasks DESC
        LIMIT 10
      `;

            db.all(rankSql, [], (err, ranks) => {
                if (!err) {
                    result.top_users = ranks || [];
                }

                res.json({ success: true, data: result });
            });
        });
    });
});

module.exports = router;