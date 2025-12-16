<template>
  <view class="category-page">
    <view class="page-header">
      <text class="page-title">分类统计</text>
      <view class="month-selector">
        <picker mode="date" fields="month" :value=" currentMonth " @change=" onMonthChange ">
          <view class="month-display">
            <text>{{ currentMonth }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="statistics-summary">
      <view class="summary-item">
        <text class="summary-label">总收入</text>
        <text class="summary-value income">¥{{ totalIncome.toFixed( 2 ) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总支出</text>
        <text class="summary-value expense">¥{{ totalExpense.toFixed( 2 ) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">结余</text>
        <text class="summary-value balance" :class=" { negative: balance < 0 } ">
          ¥{{ balance.toFixed( 2 ) }}
        </text>
      </view>
    </view>

    <view class="category-sections">
      <view class="category-section">
        <view class="section-header">
          <text class="section-title">支出分类</text>
        </view>
        <view class="category-list">
          <view class="category-card" v-for=" category in expenseCategories " :key=" category.id ">
            <view class="category-icon-wrapper" :style=" { backgroundColor: category.color } ">
              <text class="category-icon">{{ category.icon }}</text>
            </view>
            <view class="category-info">
              <text class="category-name">{{ category.name }}</text>
              <text class="category-count">{{ category.transaction_count }} 笔</text>
            </view>
            <view class="category-amount-wrapper">
              <text class="category-amount">¥{{ category.total_amount.toFixed( 2 ) }}</text>
              <text class="category-percent" v-if=" totalExpense > 0 ">
                {{ ( ( category.total_amount / totalExpense ) * 100 ).toFixed( 1 ) }}%
              </text>
            </view>
          </view>
          <view class="empty-state" v-if=" expenseCategories.length === 0 ">
            <text class="empty-text">暂无支出记录</text>
          </view>
        </view>
      </view>

      <view class="category-section">
        <view class="section-header">
          <text class="section-title">收入分类</text>
        </view>
        <view class="category-list">
          <view class="category-card" v-for=" category in incomeCategories " :key=" category.id ">
            <view class="category-icon-wrapper" :style=" { backgroundColor: category.color } ">
              <text class="category-icon">{{ category.icon }}</text>
            </view>
            <view class="category-info">
              <text class="category-name">{{ category.name }}</text>
              <text class="category-count">{{ category.transaction_count }} 笔</text>
            </view>
            <view class="category-amount-wrapper">
              <text class="category-amount">¥{{ category.total_amount.toFixed( 2 ) }}</text>
              <text class="category-percent" v-if=" totalIncome > 0 ">
                {{ ( ( category.total_amount / totalIncome ) * 100 ).toFixed( 1 ) }}%
              </text>
            </view>
          </view>
          <view class="empty-state" v-if=" incomeCategories.length === 0 ">
            <text class="empty-text">暂无收入记录</text>
          </view>
        </view>
      </view>
    </view>

    <view class="custom-category-section">
      <view class="section-header">
        <text class="section-title">自定义分类</text>
        <view class="add-category-btn" @click=" showAddCategoryForm ">
          <text class="add-icon">+</text>
        </view>
      </view>
      <view class="custom-category-list">
        <view class="custom-category-item" v-for=" category in customCategories " :key=" category.id ">
          <text class="custom-icon">{{ category.icon }}</text>
          <text class="custom-name">{{ category.name }}</text>
          <text class="custom-type">{{ category.type === 'income' ? '收入' : '支出' }}</text>
          <view class="custom-actions">
            <view class="action-btn edit" @click="editCategory( category )">编辑</view>
            <view class="action-btn delete" @click="deleteCategory( category )">删除</view>
          </view>
        </view>
        <view class="empty-state" v-if=" customCategories.length === 0 ">
          <text class="empty-text">暂无自定义分类</text>
        </view>
      </view>
    </view>

    <view class="category-form-overlay" v-if=" showCategoryForm " @click=" handleOverlayClick ">
      <view class="category-form-container" @click.stop>
        <view class="form-header">
          <text class="form-title">{{ isEditMode ? '编辑分类' : '新增分类' }}</text>
          <view class="close-btn" @click=" closeCategoryForm ">✕</view>
        </view>

        <view class="form-content">
          <view class="form-group">
            <text class="form-label">分类名称</text>
            <input class="form-input" type="text" :value=" categoryForm.name " @input=" onNameInput "
              placeholder="请输入分类名称" />
          </view>

          <view class="form-group">
            <text class="form-label">分类类型</text>
            <view class="type-selector">
              <view class="type-option" :class=" { active: categoryForm.type === 'expense' } "
                @click="selectCategoryType( 'expense' )">
                <text class="type-text">支出</text>
              </view>
              <view class="type-option" :class=" { active: categoryForm.type === 'income' } "
                @click="selectCategoryType( 'income' )">
                <text class="type-text">收入</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">图标</text>
            <view class="icon-selector">
              <view class="icon-option" v-for=" icon in iconOptions " :key=" icon "
                :class=" { selected: categoryForm.icon === icon } " @click="selectIcon( icon )">
                <text class="icon-text">{{ icon }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">颜色</text>
            <view class="color-selector">
              <view class="color-option" v-for=" color in colorOptions " :key=" color "
                :class=" { selected: categoryForm.color === color } " :style=" { backgroundColor: color } "
                @click="selectColor( color )">
              </view>
            </view>
          </view>
        </view>

        <view class="form-actions">
          <view class="btn btn-cancel" @click=" closeCategoryForm ">取消</view>
          <view class="btn btn-submit" @click=" submitCategoryForm ">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { transactionApi, categoryApi, getCurrentMonth, getMonthRange } from '../../utils/api';

export default {
  name: 'CategoryPage',
  data ()
  {
    return {
      currentMonth: '',
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expenseCategories: [],
      incomeCategories: [],
      customCategories: [],
      showCategoryForm: false,
      isEditMode: false,
      categoryForm: {
        id: null,
        name: '',
        type: 'expense',
        icon: '📌',
        color: '#6FCF97'
      },
      iconOptions: [ '📌', '🍜', '🚗', '🛍️', '🎮', '💊', '💰', '💼', '📈', '💵', '🏠', '✈️', '📱', '🎬', '📚' ],
      colorOptions: [ '#6FCF97', '#F2994A', '#BB6BD9', '#56CCF2', '#EB5757', '#27AE60', '#2D9CDB', '#828282' ]
    };
  },
  mounted ()
  {
    this.currentMonth = getCurrentMonth();
    this.loadStatistics();
    this.loadCustomCategories();
  },
  methods: {
    loadStatistics ()
    {
      const [ year, month ] = this.currentMonth.split( '-' ).map( Number );
      const { startDate, endDate } = getMonthRange( year, month );

      transactionApi.getStatistics( startDate, endDate ).then( res =>
      {
        if ( res.success && res.data )
        {
          this.totalIncome = res.data.summary?.totalIncome || 0;
          this.totalExpense = res.data.summary?.totalExpense || 0;
          this.balance = res.data.summary?.balance || 0;
          this.expenseCategories = res.data.expense || [];
          this.incomeCategories = res.data.income || [];
        }
      } ).catch( err =>
      {
        console.error( '加载统计数据失败:', err );
        uni.showToast( {
          title: '加载失败',
          icon: 'none'
        } );
      } );
    },

    loadCustomCategories ()
    {
      categoryApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.customCategories = res.data.filter( c => c.is_custom === 1 );
        }
      } ).catch( err =>
      {
        console.error( '加载自定义分类失败:', err );
      } );
    },

    onMonthChange ( e )
    {
      this.currentMonth = e.detail.value;
      this.loadStatistics();
    },

    showAddCategoryForm ()
    {
      this.isEditMode = false;
      this.categoryForm = {
        id: null,
        name: '',
        type: 'expense',
        icon: '📌',
        color: '#6FCF97'
      };
      this.showCategoryForm = true;
    },

    editCategory ( category )
    {
      this.isEditMode = true;
      this.categoryForm = {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon || '📌',
        color: category.color || '#6FCF97'
      };
      this.showCategoryForm = true;
    },

    deleteCategory ( category )
    {
      uni.showModal( {
        title: '确认删除',
        content: `确定要删除分类"${ category.name }"吗？`,
        success: ( res ) =>
        {
          if ( res.confirm )
          {
            categoryApi.delete( category.id ).then( response =>
            {
              if ( response.success )
              {
                uni.showToast( {
                  title: '删除成功',
                  icon: 'success'
                } );
                this.loadCustomCategories();
                this.loadStatistics();
              } else
              {
                uni.showToast( {
                  title: response.message || '删除失败',
                  icon: 'none'
                } );
              }
            } ).catch( err =>
            {
              console.error( '删除分类失败:', err );
              uni.showToast( {
                title: '删除失败',
                icon: 'none'
              } );
            } );
          }
        }
      } );
    },

    onNameInput ( e )
    {
      this.categoryForm.name = e.detail.value;
    },

    selectCategoryType ( type )
    {
      this.categoryForm.type = type;
    },

    selectIcon ( icon )
    {
      this.categoryForm.icon = icon;
    },

    selectColor ( color )
    {
      this.categoryForm.color = color;
    },

    handleOverlayClick ()
    {
      this.closeCategoryForm();
    },

    closeCategoryForm ()
    {
      this.showCategoryForm = false;
    },

    submitCategoryForm ()
    {
      if ( !this.categoryForm.name.trim() )
      {
        uni.showToast( {
          title: '请输入分类名称',
          icon: 'none'
        } );
        return;
      }

      const submitData = {
        name: this.categoryForm.name.trim(),
        type: this.categoryForm.type,
        icon: this.categoryForm.icon,
        color: this.categoryForm.color
      };

      const apiCall = this.isEditMode
        ? categoryApi.update( this.categoryForm.id, submitData )
        : categoryApi.create( submitData );

      apiCall.then( res =>
      {
        if ( res.success )
        {
          uni.showToast( {
            title: this.isEditMode ? '更新成功' : '添加成功',
            icon: 'success'
          } );
          this.closeCategoryForm();
          this.loadCustomCategories();
          this.loadStatistics();
        } else
        {
          uni.showToast( {
            title: res.message || '操作失败',
            icon: 'none'
          } );
        }
      } ).catch( err =>
      {
        console.error( '提交失败:', err );
        uni.showToast( {
          title: '操作失败',
          icon: 'none'
        } );
      } );
    }
  }
};
</script>

<style scoped>
uni-input {
  height: auto !important;
  min-height: 0 !important;
  line-height: normal !important;
}

.category-page {
  min-height: 100vh;
  background-color: #F2F2F2;
  padding: 32rpx;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.page-title {
  font-size: 40rpx;
  font-weight: 400;
  color: #333333;
}

.month-selector {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 12rpx 24rpx;
}

.month-display {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: #333333;
}

.arrow {
  font-size: 20rpx;
  color: #828282;
}

.statistics-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.summary-item {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-label {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.summary-value {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.summary-value.income {
  color: #6FCF97;
}

.summary-value.expense {
  color: #F2994A;
}

.summary-value.balance {
  color: #333333;
}

.summary-value.negative {
  color: #EB5757;
}

.category-sections {
  margin-bottom: 32rpx;
}

.category-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.category-card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-icon {
  font-size: 40rpx;
}

.category-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.category-name {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.category-count {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.category-amount-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.category-amount {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.category-percent {
  font-size: 24rpx;
  font-weight: 300;
  color: #6FCF97;
}

.custom-category-section {
  margin-bottom: 32rpx;
}

.add-category-btn {
  width: 56rpx;
  height: 56rpx;
  background-color: #6FCF97;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.add-icon {
  font-size: 40rpx;
  color: #FFFFFF;
}

.custom-category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.custom-category-item {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.custom-icon {
  font-size: 40rpx;
}

.custom-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.custom-type {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
  padding: 4rpx 12rpx;
  background-color: #F2F2F2;
  border-radius: 4rpx;
}

.custom-actions {
  display: flex;
  gap: 8rpx;
}

.action-btn {
  padding: 8rpx 16rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
  font-weight: 300;
  cursor: pointer;
}

.action-btn.edit {
  background-color: #6FCF97;
  color: #FFFFFF;
}

.action-btn.delete {
  background-color: #EB5757;
  color: #FFFFFF;
}

.empty-state {
  padding: 48rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
}

.category-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.category-form-container {
  width: 90%;
  max-width: 600rpx;
  max-height: 85vh;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50rpx);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.form-header {
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #F2F2F2;
}

.form-title {
  font-size: 36rpx;
  font-weight: 400;
  color: #333333;
}

.close-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #828282;
  cursor: pointer;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
  margin-bottom: 16rpx;
}

.form-input {
  width: 100%;
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.type-selector {
  display: flex;
  gap: 16rpx;
}

.type-option {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.type-option.active {
  background-color: #6FCF97;
}

.type-option.active .type-text {
  color: #FFFFFF;
}

.type-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16rpx;
}

.icon-option {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-option.selected {
  background-color: #6FCF97;
}

.icon-text {
  font-size: 40rpx;
}

.color-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.color-option {
  aspect-ratio: 1;
  border-radius: 8rpx;
  cursor: pointer;
  border: 3rpx solid transparent;
  transition: all 0.3s;
}

.color-option.selected {
  border-color: #333333;
}

.form-actions {
  padding: 24rpx 32rpx;
  display: flex;
  gap: 16rpx;
  border-top: 1rpx solid #F2F2F2;
}

.btn {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 300;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:active {
  opacity: 0.8;
}

.btn-cancel {
  background-color: #F2F2F2;
  color: #828282;
}

.btn-submit {
  background-color: #6FCF97;
  color: #FFFFFF;
}
</style>