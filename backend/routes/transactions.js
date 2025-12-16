const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

router.get('/', (req, res) => {
  const { startDate, endDate, year, month } = req.query;

  if (year && month) {
    Transaction.getTransactionsByMonth(parseInt(year), parseInt(month), (err, transactions) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '查询交易记录失败', 
          error: err.message 
        });
      }

      res.json({ 
        success: true, 
        data: transactions || [],
        count: transactions?.length || 0
      });
    });
  } else if (startDate && endDate) {
    Transaction.getTransactionsByDateRange(startDate, endDate, (err, transactions) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '查询交易记录失败', 
          error: err.message 
        });
      }

      res.json({ 
        success: true, 
        data: transactions || [],
        count: transactions?.length || 0
      });
    });
  } else {
    Transaction.getAllTransactions((err, transactions) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '查询交易记录失败', 
          error: err.message 
        });
      }

      res.json({ 
        success: true, 
        data: transactions || [],
        count: transactions?.length || 0
      });
    });
  }
});

router.get('/statistics', (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少必填参数：开始日期和结束日期' 
    });
  }

  Transaction.getCategoryStatistics(startDate, endDate, (err, statistics) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询分类统计失败', 
        error: err.message 
      });
    }

    const incomeStats = statistics.filter(s => s.type === 'income');
    const expenseStats = statistics.filter(s => s.type === 'expense');

    const totalIncome = incomeStats.reduce((sum, s) => sum + s.total_amount, 0);
    const totalExpense = expenseStats.reduce((sum, s) => sum + s.total_amount, 0);

    res.json({ 
      success: true, 
      data: {
        categories: statistics,
        income: incomeStats,
        expense: expenseStats,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense
        }
      }
    });
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  Transaction.getTransactionById(id, (err, transaction) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询交易详情失败', 
        error: err.message 
      });
    }

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: '交易记录不存在' 
      });
    }

    res.json({ 
      success: true, 
      data: transaction 
    });
  });
});

router.post('/', (req, res) => {
  const { amount, type, categoryId, date, note } = req.body;

  if (!amount || !type || !categoryId || !date) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少必填字段：金额、类型、分类或日期' 
    });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      message: '交易类型必须为income或expense' 
    });
  }

  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: '金额必须为正数' 
    });
  }

  const transactionData = {
    amount: parseFloat(amount),
    type,
    categoryId: parseInt(categoryId),
    date,
    note: note?.trim() || ''
  };

  Transaction.createTransaction(transactionData, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '创建交易记录失败', 
        error: err.message 
      });
    }

    if (type === 'expense') {
      const month = date.substring(0, 7);
      Budget.updateBudgetUsage(month, categoryId, parseFloat(amount), (budgetErr) => {
        if (budgetErr) {
          console.error('更新预算使用情况失败:', budgetErr.message);
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      message: '交易记录创建成功',
      data: result 
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { amount, type, categoryId, date, note } = req.body;

  if (type && !['income', 'expense'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      message: '交易类型必须为income或expense' 
    });
  }

  if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
    return res.status(400).json({ 
      success: false, 
      message: '金额必须为正数' 
    });
  }

  const updateData = {};
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (type) updateData.type = type;
  if (categoryId) updateData.categoryId = parseInt(categoryId);
  if (date) updateData.date = date;
  if (note !== undefined) updateData.note = note.trim();

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: '至少需要提供一个更新字段' 
    });
  }

  Transaction.updateTransaction(id, updateData, (err, result) => {
    if (err) {
      if (err.message.includes('不存在')) {
        return res.status(404).json({ 
          success: false, 
          message: '交易记录不存在' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: '更新交易记录失败', 
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: '交易记录更新成功',
      data: { id, ...updateData }
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Transaction.getTransactionById(id, (err, transaction) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询交易记录失败', 
        error: err.message 
      });
    }

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: '交易记录不存在' 
      });
    }

    Transaction.deleteTransaction(id, (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '删除交易记录失败', 
          error: err.message 
        });
      }

      if (transaction.type === 'expense') {
        const month = transaction.date.substring(0, 7);
        Budget.updateBudgetUsage(month, transaction.category_id, -transaction.amount, (budgetErr) => {
          if (budgetErr) {
            console.error('更新预算使用情况失败:', budgetErr.message);
          }
        });
      }

      res.json({ 
        success: true, 
        message: '交易记录删除成功' 
      });
    });
  });
});

module.exports = router;