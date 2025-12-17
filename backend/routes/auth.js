const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

const JWT_SECRET = process.env.JWT_SECRET || 'finance-assistant-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

router.post('/register', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段：用户名或密码'
    });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: '用户名长度至少为3个字符'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码长度至少为6个字符'
    });
  }

  const validRoles = ['resource_coordinator', 'tech_manager', 'consultant', 'user'];
  const userRole = role && validRoles.includes(role) ? role : 'user';

  User.getUserByUsername(username.trim(), (err, existingUser) => {
    if (err) {
      logger.error(`查询用户失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试',
        error: err.message
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const userData = {
      username: username.trim(),
      password: hashedPassword,
      role: userRole
    };

    User.createUser(userData, (err, result) => {
      if (err) {
        logger.error(`创建用户失败: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: '注册失败',
          error: err.message
        });
      }

      const token = jwt.sign(
        {
          id: result.id,
          username: userData.username,
          role: userData.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          id: result.id,
          username: userData.username,
          role: userData.role,
          token
        }
      });
    });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段：用户名或密码'
    });
  }

  User.getUserByUsername(username.trim(), (err, user) => {
    if (err) {
      logger.error(`查询用户失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '登录失败，请稍后重试',
        error: err.message
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        token
      }
    });
  });
});

router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    User.getUserById(decoded.id, (err, user) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          message: '无效的认证令牌'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  } catch (err) {
    logger.error(`验证令牌失败: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: '无效或过期的认证令牌'
    });
  }
});

router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

router.post('/auto-login', (req, res) => {
  const defaultUsername = 'admin';
  const defaultPassword = '123456';

  User.getUserByUsername(defaultUsername, (err, user) => {
    if (err) {
      logger.error(`自动登录查询用户失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '自动登录失败，请稍后重试',
        error: err.message
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '默认管理员账号不存在'
      });
    }

    const isPasswordValid = bcrypt.compareSync(defaultPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '默认管理员密码验证失败'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: '自动登录成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        token
      }
    });
  });
});

// 获取所有用户列表（仅管理员可访问）
router.get('/users', (req, res) => {
  // 支持分页和搜索
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const role = req.query.role || '';

  // 计算偏移量
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions = {};
  const params = [];

  if (search) {
    conditions.username = `username LIKE ?`;
    params.push(`%${search}%`);
  }

  if (role) {
    conditions.role = `role = ?`;
    params.push(role);
  }

  // 构建WHERE子句
  let whereClause = '';
  const conditionKeys = Object.keys(conditions);

  if (conditionKeys.length > 0) {
    whereClause = 'WHERE ' + conditionKeys.map(key => conditions[key]).join(' AND ');
  }

  // 查询用户总数
  const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;

  User.queryAllUsers(countQuery, params, (err, countResult) => {
    if (err) {
      logger.error(`查询用户总数失败: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: '获取用户列表失败',
        error: err.message
      });
    }

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 查询用户数据
    const query = `
      SELECT id, username, role, created_at, updated_at 
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];

    User.queryAllUsers(query, queryParams, (err, results) => {
      if (err) {
        logger.error(`查询用户列表失败: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: '获取用户列表失败',
          error: err.message
        });
      }

      // 过滤掉敏感信息，确保不返回密码
      const users = results.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    });
  });
});
module.exports = router;