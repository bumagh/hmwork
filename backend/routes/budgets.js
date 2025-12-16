const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

router.get('/', (req, res) => {
  const { month } = req.query;
  
  if (!month) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少月份参数' 
    });
  }

  Budget.getBudgetByMonth(month, (err, budgets) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询预算失败', 
        error: err.message 
      });
    }

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);

    Transaction.getTransactionsByMonth(year, monthNum, (err, transactions) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '查询交易记录失败', 
          error: err.message 
        });
      }

      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      const categoryExpenses = {};
      expenseTransactions.forEach(t => {
        categoryExpenses[t.category_id] = (categoryExpenses[t.category_id] || 0) + t.amount;
      });

      const result = budgets.map(budget => {
        const usedAmount = budget.category_id ? 
          (categoryExpenses[budget.category_id] || 0) : 
          totalExpense;
        
        const remaining = budget.category_id ? 
          (budget.category_budget - usedAmount) : 
          (budget.total_budget - usedAmount);
        
        const percentage = budget.category_id ? 
          (budget.category_budget > 0 ? (usedAmount / budget.category_budget * 100) : 0) : 
          (budget.total_budget > 0 ? (usedAmount / budget.total_budget * 100) : 0);

        return {
          ...budget,
          used_amount: usedAmount,
          remaining,
          percentage: Math.round(percentage * 100) / 100,
          is_exceeded: remaining < 0
        };
      });

      res.json({ 
        success: true, 
        data: result,
        summary: {
          total_budget: budgets.find(b => !b.category_id)?.total_budget || 0,
          total_expense: totalExpense,
          total_remaining: (budgets.find(b => !b.category_id)?.total_budget || 0) - totalExpense
        }
      });
    });
  });
});

router.post('/', (req, res) => {
  const { month, totalBudget, categoryBudgets } = req.body;

  if (!month) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少月份参数' 
    });
  }

  Budget.createBudget({ 
    month, 
    totalBudget: totalBudget || 0, 
    categoryId: null, 
    categoryBudget: 0 
  }, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '创建总预算失败', 
        error: err.message 
      });
    }

    if (categoryBudgets && Array.isArray(categoryBudgets)) {
      let completed = 0;
      categoryBudgets.forEach(cb => {
        Budget.createBudget({ 
          month, 
          totalBudget: totalBudget || 0, 
          categoryId: cb.categoryId, 
          categoryBudget: cb.budget 
        }, (err) => {
          completed++;
          if (completed === categoryBudgets.length) {
            res.json({ 
              success: true, 
              message: '预算设置成功',
              data: { month, totalBudget, categoryBudgets }
            });
          }
        });
      });
    } else {
      res.json({ 
        success: true, 
        message: '总预算设置成功',
        data: { month, totalBudget }
      });
    }
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { totalBudget, categoryBudget } = req.body;

  if (!totalBudget && !categoryBudget) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少预算金额' 
    });
  }

  const updateData = {};
  if (totalBudget !== undefined) updateData.total_budget = totalBudget;
  if (categoryBudget !== undefined) updateData.category_budget = categoryBudget;

  const db = Budget.getDatabase();
  const sql = `
    UPDATE budgets
    SET ${Object.keys(updateData).map(k => `${k} = ?`).join(', ')},
        updated_at = datetime('now', '+8 hours')
    WHERE id = ?
  `;

  db.run(sql, [...Object.values(updateData), id], function(err) {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '更新预算失败', 
        error: err.message 
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '预算不存在' 
      });
    }

    res.json({ 
      success: true, 
      message: '预算更新成功',
      data: { id, ...updateData }
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Budget.deleteBudget(id, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '删除预算失败', 
        error: err.message 
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '预算不存在' 
      });
    }

    res.json({ 
      success: true, 
      message: '预算删除成功' 
    });
  });
});

router.get('/alerts', (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少月份参数' 
    });
  }

  Budget.getBudgetAlert(month, (err, alerts) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询预算告警失败', 
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      data: alerts,
      count: alerts.length
    });
  });
});

module.exports = router;