const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

router.get('/', (req, res) => {
  const { project_id } = req.query;

  if (project_id) {
    Task.getTasksByProject(parseInt(project_id), (err, tasks) => {
      if (err) {
        logger.error(`查询项目任务失败: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: '查询项目任务失败',
          error: err.message
        });
      }

      res.json({
        success: true,
        data: tasks || [],
        count: tasks?.length || 0
      });
    });
  } else {
    Task.getAllTasks((err, tasks) => {
      if (err) {
        logger.error(`查询任务列表失败: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: '查询任务列表失败',
          error: err.message
        });
      }

      res.json({
        success: true,
        data: tasks || [],
        count: tasks?.length || 0
      });
    });
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  Task.getTaskById(parseInt(id), (err, task) => {
    if (err) {
      logger.error(`查询任务详情失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询任务详情失败',
        error: err.message
      });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  });
});

router.post('/', (req, res) => {
  const { name, description, project_id, assigned_to, status, priority, due_date } = req.body;

  if (!name || !project_id || !assigned_to) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段：任务名称、项目ID或分配人员'
    });
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '任务状态必须为pending、in_progress、completed或cancelled'
    });
  }

  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: '任务优先级必须为low、medium、high或urgent'
    });
  }

  const taskData = {
    name: name.trim(),
    description: description?.trim() || '',
    project_id: parseInt(project_id),
    assigned_to: parseInt(assigned_to),
    status: status || 'pending',
    priority: priority || 'medium',
    due_date: due_date || null
  };

  Task.createTask(taskData, (err, result) => {
    if (err) {
      logger.error(`创建任务失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '创建任务失败',
        error: err.message
      });
    }

    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: result
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, assigned_to, status, priority, due_date } = req.body;

  if (!name && !description && !assigned_to && !status && !priority && !due_date) {
    return res.status(400).json({
      success: false,
      message: '至少需要提供一个更新字段'
    });
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '任务状态必须为pending、in_progress、completed或cancelled'
    });
  }

  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: '任务优先级必须为low、medium、high或urgent'
    });
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (assigned_to) updateData.assigned_to = parseInt(assigned_to);
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (due_date !== undefined) updateData.due_date = due_date;

  Task.updateTask(parseInt(id), updateData, (err, result) => {
    if (err) {
      if (err.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: '任务不存在'
        });
      }

      logger.error(`更新任务失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '更新任务失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      message: '任务更新成功',
      data: { id: parseInt(id), ...updateData }
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Task.deleteTask(parseInt(id), (err, result) => {
    if (err) {
      logger.error(`删除任务失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '删除任务失败',
        error: err.message
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      message: '任务删除成功'
    });
  });
});

router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  Task.getTasksByUser(parseInt(userId), (err, tasks) => {
    if (err) {
      logger.error(`查询用户任务失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询用户任务失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      count: tasks?.length || 0
    });
  });
});

router.get('/status/:status', (req, res) => {
  const { status } = req.params;

  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务状态'
    });
  }

  Task.getTasksByStatus(status, (err, tasks) => {
    if (err) {
      logger.error(`查询指定状态任务失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询指定状态任务失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      count: tasks?.length || 0
    });
  });
});

module.exports = router;