<template>
  <view class="index-page">
    <view class="page-header">
      <view class="header-content">
        <text class="page-title">华梦沃客</text>
        <view class="budget-info" @click=" showBudgetSetting ">
          <text class="budget-label">本月预算</text>
          <text class="budget-amount" :class=" { exceeded: isExceeded } ">
            ¥{{ currentBudget.remaining.toFixed( 2 ) }}
          </text>
          <text class="budget-detail">
            {{ currentBudget.used.toFixed( 2 ) }} / {{ currentBudget.total.toFixed( 2 ) }}
          </text>
        </view>
      </view>
    </view>

    <view class="statistics-bar">
      <view class="stat-item income">
        <text class="stat-label">收入</text>
        <text class="stat-value">¥{{ monthIncome.toFixed( 2 ) }}</text>
      </view>
      <view class="stat-item expense">
        <text class="stat-label">支出</text>
        <text class="stat-value">¥{{ monthExpense.toFixed( 2 ) }}</text>
      </view>
      <view class="stat-item balance">
        <text class="stat-label">结余</text>
        <text class="stat-value">¥{{ ( monthIncome - monthExpense ).toFixed( 2 ) }}</text>
      </view>
    </view>

    <view class="month-selector">
      <picker mode="date" fields="month" :value=" currentMonth " @change=" onMonthChange ">
        <view class="month-picker">
          <text class="month-text">{{ currentMonth }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <scroll-view class="transaction-list" scroll-y>
      <view class="transaction-item" v-for=" item in transactions " :key=" item.id ">
        <view class="transaction-left">
          <view class="category-icon-wrapper" :style=" { backgroundColor: item.category_color } ">
            <text class="category-icon">{{ item.category_icon }}</text>
          </view>
          <view class="transaction-info">
            <text class="transaction-category">{{ item.category_name }}</text>
            <text class="transaction-date">{{ item.date }}</text>
            <text class="transaction-note" v-if=" item.note ">{{ item.note }}</text>
          </view>
        </view>
        <view class="transaction-right">
          <text class="transaction-amount" :class=" item.type ">
            {{ item.type === 'income' ? '+' : '-' }}¥{{ item.amount.toFixed( 2 ) }}
          </text>
          <view class="transaction-actions">
            <view class="action-btn edit" @click="editTransaction( item )">编辑</view>
            <view class="action-btn delete" @click="deleteTransaction( item )">删除</view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if=" transactions.length === 0 ">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无交易记录</text>
        <text class="empty-tip">点击下方按钮开始记账</text>
      </view>
    </scroll-view>

    <view class="bottom-actions">
      <view class="action-button category" @click=" navigateToCategory ">
        <text class="action-icon">📊</text>
        <text class="action-text">分类统计</text>
      </view>
      <view class="action-button add" @click=" showAddTransaction ">
        <text class="action-icon add-icon">+</text>
      </view>
      <view class="action-button budget" @click=" showBudgetSetting ">
        <text class="action-icon">💰</text>
        <text class="action-text">预算设置</text>
      </view>
    </view>

    <transaction-form :visible=" transactionFormVisible " :transaction=" editingTransaction "
      @close=" closeTransactionForm " @success=" handleTransactionSuccess " />

    <budget-form :visible=" budgetFormVisible " :month=" currentMonth " @close=" closeBudgetForm "
      @success=" handleBudgetSuccess " />

    <view class="alert-overlay" v-if=" budgetAlerts.length > 0 && showAlert " @click=" dismissAlert ">
      <view class="alert-container" @click.stop>
        <view class="alert-header">
          <text class="alert-title">预算提醒</text>
          <view class="close-btn" @click=" dismissAlert ">✕</view>
        </view>
        <view class="alert-content">
          <view class="alert-item" v-for=" alert in budgetAlerts " :key=" alert.id ">
            <text class="alert-icon">⚠️</text>
            <view class="alert-info">
              <text class="alert-category">{{ alert.category_name || '总预算' }}</text>
              <text class="alert-message">
                已使用 ¥{{ alert.used_amount.toFixed( 2 ) }} / ¥{{ ( alert.category_budget || alert.total_budget ).toFixed(
                  2 )
                }}
              </text>
              <text class="alert-percent">{{ alert.usage_percentage.toFixed( 1 ) }}%</text>
            </view>
          </view>
        </view>
        <view class="alert-actions">
          <view class="alert-btn" @click=" dismissAlert ">知道了</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { transactionApi, budgetApi, getCurrentMonth, getMonthRange } from '../../utils/api';
import TransactionForm from '../../components/TransactionForm.vue';
import BudgetForm from '../../components/BudgetForm.vue';

export default {
  name: 'IndexPage',
  components: {
    TransactionForm,
    BudgetForm
  },
  data ()
  {
    return {
      currentMonth: '',
      transactions: [],
      monthIncome: 0,
      monthExpense: 0,
      currentBudget: {
        total: 0,
        used: 0,
        remaining: 0
      },
      isExceeded: false,
      transactionFormVisible: false,
      budgetFormVisible: false,
      editingTransaction: null,
      budgetAlerts: [],
      showAlert: false,
      isLoading: false
    };
  },
  mounted ()
  {
    this.currentMonth = getCurrentMonth();
    this.loadData();
  },
  methods: {
    loadData ()
    {
      this.loadTransactions();
      this.loadBudget();
      this.checkBudgetAlerts();
    },

    loadTransactions ()
    {
      const [ year, month ] = this.currentMonth.split( '-' ).map( Number );

      transactionApi.getByMonth( year, month ).then( res =>
      {
        if ( res.success && res.data )
        {
          this.transactions = res.data;
          this.calculateMonthSummary();
        }
      } ).catch( err =>
      {
        console.error( '加载交易记录失败:', err );
        uni.showToast( {
          title: '加载失败',
          icon: 'none'
        } );
      } );
    },

    calculateMonthSummary ()
    {
      this.monthIncome = this.transactions
        .filter( t => t.type === 'income' )
        .reduce( ( sum, t ) => sum + t.amount, 0 );

      this.monthExpense = this.transactions
        .filter( t => t.type === 'expense' )
        .reduce( ( sum, t ) => sum + t.amount, 0 );
    },

    loadBudget ()
    {
      budgetApi.getByMonth( this.currentMonth ).then( res =>
      {
        if ( res.success && res.data )
        {
          const totalBudgetItem = res.data.data?.find( b => !b.category_id );

          if ( totalBudgetItem )
          {
            this.currentBudget.total = totalBudgetItem.total_budget || 0;
            this.currentBudget.used = this.monthExpense;
            this.currentBudget.remaining = this.currentBudget.total - this.currentBudget.used;
            this.isExceeded = this.currentBudget.remaining < 0;
          } else
          {
            this.currentBudget = { total: 0, used: this.monthExpense, remaining: -this.monthExpense };
            this.isExceeded = false;
          }
        }
      } ).catch( err =>
      {
        console.error( '加载预算失败:', err );
      } );
    },

    checkBudgetAlerts ()
    {
      budgetApi.getAlerts( this.currentMonth ).then( res =>
      {
        if ( res.success && res.data && res.data.length > 0 )
        {
          this.budgetAlerts = res.data;
          this.showAlert = true;
        }
      } ).catch( err =>
      {
        console.error( '加载预算告警失败:', err );
      } );
    },

    onMonthChange ( e )
    {
      this.currentMonth = e.detail.value;
      this.loadData();
    },

    showAddTransaction ()
    {
      this.editingTransaction = null;
      this.transactionFormVisible = true;
    },

    editTransaction ( transaction )
    {
      this.editingTransaction = transaction;
      this.transactionFormVisible = true;
    },

    deleteTransaction ( transaction )
    {
      uni.showModal( {
        title: '确认删除',
        content: `确定要删除这条记录吗？`,
        success: ( res ) =>
        {
          if ( res.confirm )
          {
            transactionApi.delete( transaction.id ).then( response =>
            {
              if ( response.success )
              {
                uni.showToast( {
                  title: '删除成功',
                  icon: 'success'
                } );
                this.loadData();
              } else
              {
                uni.showToast( {
                  title: response.message || '删除失败',
                  icon: 'none'
                } );
              }
            } ).catch( err =>
            {
              console.error( '删除失败:', err );
              uni.showToast( {
                title: '删除失败',
                icon: 'none'
              } );
            } );
          }
        }
      } );
    },

    closeTransactionForm ()
    {
      this.transactionFormVisible = false;
      this.editingTransaction = null;
    },

    handleTransactionSuccess ()
    {
      this.loadData();
    },

    showBudgetSetting ()
    {
      this.budgetFormVisible = true;
    },

    closeBudgetForm ()
    {
      this.budgetFormVisible = false;
    },

    handleBudgetSuccess ()
    {
      this.loadData();
    },

    navigateToCategory ()
    {
      uni.navigateTo( {
        url: '/pages/category/index'
      } );
    },

    dismissAlert ()
    {
      this.showAlert = false;
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

.index-page {
  min-height: 100vh;
  background-color: #F2F2F2;
  padding-bottom: 120rpx;
}

.page-header {
  background-color: #FFFFFF;
  padding: 32rpx;
  margin-bottom: 16rpx;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.page-title {
  font-size: 40rpx;
  font-weight: 400;
  color: #333333;
}

.budget-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
}

.budget-label {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.budget-amount {
  font-size: 48rpx;
  font-weight: 400;
  color: #6FCF97;
}

.budget-amount.exceeded {
  color: #EB5757;
}

.budget-detail {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.statistics-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 0 32rpx;
  margin-bottom: 16rpx;
}

.stat-item {
  background-color: #FFFFFF;
  padding: 24rpx;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.stat-value {
  font-size: 28rpx;
  font-weight: 400;
  color: #333333;
}

.stat-item.income .stat-value {
  color: #6FCF97;
}

.stat-item.expense .stat-value {
  color: #F2994A;
}

.month-selector {
  padding: 0 32rpx 16rpx;
}

.month-picker {
  background-color: #FFFFFF;
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.arrow {
  font-size: 20rpx;
  color: #828282;
}

.transaction-list {
  padding: 0 32rpx;
  max-height: calc(100vh - 600rpx);
}

.transaction-item {
  background-color: #FFFFFF;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.transaction-left {
  display: flex;
  gap: 16rpx;
  flex: 1;
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

.transaction-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
}

.transaction-category {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.transaction-date {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.transaction-note {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
  margin-top: 4rpx;
}

.transaction-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.transaction-amount {
  font-size: 32rpx;
  font-weight: 400;
}

.transaction-amount.income {
  color: #6FCF97;
}

.transaction-amount.expense {
  color: #F2994A;
}

.transaction-actions {
  display: flex;
  gap: 8rpx;
}

.action-btn {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
  font-weight: 300;
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
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
}

.empty-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.empty-tip {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #FFFFFF;
  padding: 24rpx 32rpx;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.08);
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
}

.action-button.add {
  width: 96rpx;
  height: 96rpx;
  background-color: #6FCF97;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 40rpx;
}

.add-icon {
  font-size: 56rpx;
  color: #FFFFFF;
}

.action-text {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

.alert-container {
  width: 85%;
  max-width: 600rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
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

.alert-header {
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #F2F2F2;
}

.alert-title {
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
}

.alert-content {
  padding: 32rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  background-color: #FFF3E0;
  border-radius: 8rpx;
}

.alert-icon {
  font-size: 32rpx;
}

.alert-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.alert-category {
  font-size: 28rpx;
  font-weight: 400;
  color: #333333;
}

.alert-message {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.alert-percent {
  font-size: 28rpx;
  font-weight: 400;
  color: #F2994A;
}

.alert-actions {
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #F2F2F2;
}

.alert-btn {
  width: 100%;
  padding: 24rpx;
  text-align: center;
  background-color: #6FCF97;
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 300;
}
</style>