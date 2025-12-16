const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

router.get('/', (req, res) => {
  const { type } = req.query;
  
  if (type && !['income', 'expense'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      message: '无效的分类类型' 
    });
  }

  const callback = (err, categories) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询分类列表失败', 
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      data: categories || [],
      count: categories?.length || 0
    });
  };

  if (type) {
    Category.getCategoriesByType(type, callback);
  } else {
    Category.getAllCategories(callback);
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  Category.getCategoryById(id, (err, category) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: '查询分类详情失败', 
        error: err.message 
      });
    }

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: '分类不存在' 
      });
    }

    res.json({ 
      success: true, 
      data: category 
    });
  });
});

router.post('/', (req, res) => {
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少必填字段：分类名称或类型' 
    });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      message: '分类类型必须为income或expense' 
    });
  }

  const categoryData = {
    name: name.trim(),
    type,
    icon: icon || '📌',
    color: color || '#828282'
  };

  Category.createCategory(categoryData, (err, result) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ 
          success: false, 
          message: '分类名称已存在' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: '创建分类失败', 
        error: err.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: '分类创建成功',
      data: result 
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;

  if (!name && !icon && !color) {
    return res.status(400).json({ 
      success: false, 
      message: '至少需要提供一个更新字段' 
    });
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (icon) updateData.icon = icon;
  if (color) updateData.color = color;

  Category.updateCategory(id, updateData, (err, result) => {
    if (err) {
      if (err.message.includes('不可编辑')) {
        return res.status(403).json({ 
          success: false, 
          message: '预设分类不可编辑' 
        });
      }
      
      if (err.message.includes('不存在')) {
        return res.status(404).json({ 
          success: false, 
          message: '分类不存在' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: '更新分类失败', 
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: '分类更新成功',
      data: { id, ...updateData }
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Category.deleteCategory(id, (err, result) => {
    if (err) {
      if (err.message.includes('不可删除')) {
        return res.status(403).json({ 
          success: false, 
          message: '预设分类不可删除' 
        });
      }
      
      if (err.message.includes('不存在')) {
        return res.status(404).json({ 
          success: false, 
          message: '分类不存在' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: '删除分类失败', 
        error: err.message 
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '分类不存在或不可删除' 
      });
    }

    res.json({ 
      success: true, 
      message: '分类删除成功' 
    });
  });
});

module.exports = router;