const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const Transaction = require('./models/Transaction');
const Category = require('./models/Category');
const Budget = require('./models/Budget');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const UserMertrics = require('./models/UserMertrics');

const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const budgetsRouter = require('./routes/budgets');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const statistics = require('./routes/statistics');

const app = express();

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

process.on('uncaughtException', (err) => {
  logger.error(`未捕获的异常: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`未处理的Promise拒绝: ${reason}`);
});

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.resolve(__dirname, '../frontend/public');
const distDir = path.resolve(__dirname, '../frontend/dist');
const publicPath = fs.existsSync(publicDir) ? publicDir : distDir;

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

const initDatabase = () => {
  try {
    Transaction.initTransactionTable();
    Category.initCategoryTable();
    Budget.initBudgetTable();
    User.initUserTable();
    Project.initProjectTable();
    Task.initTaskTable();
    UserMertrics.initMetricsTable();
    console.log('数据库初始化完成');
  } catch (err) {
    logger.error(`数据库初始化失败: ${err.message}`);
  }
};

initDatabase();

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/statistics', statistics);

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '华梦沃客 API服务运行中',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      transactions: '/api/transactions',
      categories: '/api/categories',
      budgets: '/api/budgets',
      projects: '/api/projects',
      tasks: '/api/tasks'
    }
  });
});

// app.get('*', (req, res) => {
//   if (!fs.existsSync(publicPath)) {
//     return res.status(404).json({
//       success: false,
//       message: '前端资源未找到'
//     });
//   }

//   const filePath = path.join(publicPath, req.path);
//   if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
//     return res.sendFile(filePath);
//   }

//   const indexPath = path.join(publicPath, 'index.html');
//   if (fs.existsSync(indexPath)) {
//     return res.sendFile(indexPath);
//   }

//   res.status(404).json({
//     success: false,
//     message: '页面未找到'
//   });
// });

app.use((err, req, res, next) => {
  logger.error(`请求错误: ${err.message}\n${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = parseInt('20261', 10);
const server = app.listen(PORT, () => {
  console.log(`华梦沃客服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API端点: http://localhost:${PORT}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`端口 ${PORT} 已被占用`);
  } else {
    logger.error(`服务器启动失败: ${err.message}`);
  }
});

module.exports = app;