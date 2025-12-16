const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
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
  Project.getAllProjects((err, projects) => {
    if (err) {
      logger.error(`查询项目列表失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询项目列表失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: projects || [],
      count: projects?.length || 0
    });
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  Project.getProjectById(parseInt(id), (err, project) => {
    if (err) {
      logger.error(`查询项目详情失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询项目详情失败',
        error: err.message
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      data: project
    });
  });
});

router.post('/', (req, res) => {
  const { name, description, created_by, start_date, end_date, status } = req.body;

  if (!name || !created_by) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段：项目名称或创建人'
    });
  }

  const validStatuses = ['planning', 'in_progress', 'completed', 'suspended', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '项目状态必须为planning、in_progress、completed、suspended或cancelled'
    });
  }

  const projectData = {
    name: name.trim(),
    description: description?.trim() || '',
    created_by: parseInt(created_by),
    start_date: start_date || null,
    end_date: end_date || null,
    status: status || 'planning'
  };

  Project.createProject(projectData, (err, result) => {
    if (err) {
      logger.error(`创建项目失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '创建项目失败',
        error: err.message
      });
    }

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: result
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, start_date, end_date, status } = req.body;

  if (!name && !description && !start_date && !end_date && !status) {
    return res.status(400).json({
      success: false,
      message: '至少需要提供一个更新字段'
    });
  }

  const validStatuses = ['planning', 'in_progress', 'completed', 'suspended', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '项目状态必须为planning、in_progress、completed、suspended或cancelled'
    });
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (start_date !== undefined) updateData.start_date = start_date;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (status) updateData.status = status;

  Project.updateProject(parseInt(id), updateData, (err, result) => {
    if (err) {
      if (err.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }

      logger.error(`更新项目失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '更新项目失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      message: '项目更新成功',
      data: { id: parseInt(id), ...updateData }
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Project.deleteProject(parseInt(id), (err, result) => {
    if (err) {
      logger.error(`删除项目失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '删除项目失败',
        error: err.message
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      message: '项目删除成功'
    });
  });
});

router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  Project.getProjectsByUser(parseInt(userId), (err, projects) => {
    if (err) {
      logger.error(`查询用户项目失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询用户项目失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: projects || [],
      count: projects?.length || 0
    });
  });
});

router.get('/status/:status', (req, res) => {
  const { status } = req.params;

  const validStatuses = ['planning', 'in_progress', 'completed', 'suspended', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目状态'
    });
  }

  Project.getProjectsByStatus(status, (err, projects) => {
    if (err) {
      logger.error(`查询指定状态项目失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '查询指定状态项目失败',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: projects || [],
      count: projects?.length || 0
    });
  });
});

module.exports = router;