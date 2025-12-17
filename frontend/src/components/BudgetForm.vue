<template>
  <view class="budget-form-overlay" v-if=" visible " @click=" handleOverlayClick ">
    <view class="budget-form-container" @click.stop>
      <view class="form-header">
        <text class="form-title">预算设置</text>
        <view class="close-btn" @click=" handleClose ">✕</view>
      </view>

      <view class="form-content">
        <view class="form-group">
          <text class="form-label">选择月份</text>
          <picker mode="date" fields="month" :value=" formData.month " @change=" onMonthChange ">
            <view class="picker-input">
              <text>{{ formData.month || '请选择月份' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="form-label">月度总预算（¥）</text>
          <input class="form-input" type="digit" :value=" formData.totalBudget " @input=" onTotalBudgetInput "
            placeholder="请输入月度总预算" />
        </view>

        <view class="category-budgets-section">
          <view class="section-header">
            <text class="section-title">分类预算</text>
            <text class="section-tip">为各支出分类设置预算</text>
          </view>

          <view class="category-list">
            <view class="category-item" v-for=" category in expenseCategories " :key=" category.id ">
              <view class="category-info">
                <text class="category-icon">{{ category.icon }}</text>
                <text class="category-name">{{ category.name }}</text>
              </view>
              <input class="category-budget-input" type="digit" :value=" getCategoryBudget( category.id ) "
                @input=" ( e ) => onCategoryBudgetInput( category.id, e ) " placeholder="预算" />
            </view>
          </view>
        </view>
      </view>

      <view class="form-actions">
        <view class="btn btn-cancel" @click=" handleClose ">取消</view>
        <view class="btn btn-submit" @click=" handleSubmit ">确定</view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { categoryApi, budgetApi, getCurrentMonth } from '../utils/api';

export default {
  name: 'BudgetForm',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    month: {
      type: String,
      default: ''
    }
  },
  data ()
  {
    return {
      formData: {
        month: '',
        totalBudget: '',
        categoryBudgets: []
      },
      expenseCategories: [],
      isLoading: false
    };
  },
  watch: {
    visible ( newVal )
    {
      if ( newVal )
      {
        this.initForm();
      }
    },
    month ( newVal )
    {
      if ( newVal )
      {
        this.formData.month = newVal;
        this.loadExistingBudget();
      }
    }
  },
  mounted ()
  {
    this.loadCategories();
  },
  methods: {
    initForm ()
    {
      this.formData.month = this.month || getCurrentMonth();
      this.loadCategories();
      if ( this.formData.month )
      {
        this.loadExistingBudget();
      }
    },

    loadCategories ()
    {
      categoryApi.getByType( 'expense' ).then( res =>
      {
        if ( res.success && res.data )
        {
          this.expenseCategories = res.data;
        }
      } ).catch( err =>
      {
        console.error( '加载分类失败:', err );
      } );
    },

    loadExistingBudget ()
    {
      if ( !this.formData.month ) return;

      budgetApi.getByMonth( this.formData.month ).then( res =>
      {
        if ( res.success && res.data )
        {
          const budgets = res.data.data || [];
          const totalBudgetItem = budgets.find( b => !b.category_id );

          if ( totalBudgetItem )
          {
            this.formData.totalBudget = String( totalBudgetItem.total_budget || '' );
          }

          this.formData.categoryBudgets = budgets
            .filter( b => b.category_id )
            .map( b => ( {
              categoryId: b.category_id,
              budget: String( b.category_budget || '' )
            } ) );
        }
      } ).catch( err =>
      {
        console.error( '加载预算失败:', err );
      } );
    },

    onMonthChange ( e )
    {
      this.formData.month = e.detail.value;
      this.loadExistingBudget();
    },

    onTotalBudgetInput ( e )
    {
      this.formData.totalBudget = e.detail.value;
    },

    onCategoryBudgetInput ( categoryId, e )
    {
      const value = e.detail.value;
      const index = this.formData.categoryBudgets.findIndex(
        cb => cb.categoryId === categoryId
      );

      if ( index > -1 )
      {
        if ( value )
        {
          this.formData.categoryBudgets[ index ].budget = value;
        } else
        {
          this.formData.categoryBudgets.splice( index, 1 );
        }
      } else if ( value )
      {
        this.formData.categoryBudgets.push( {
          categoryId: categoryId,
          budget: value
        } );
      }
    },

    getCategoryBudget ( categoryId )
    {
      const item = this.formData.categoryBudgets.find(
        cb => cb.categoryId === categoryId
      );
      return item ? item.budget : '';
    },

    handleOverlayClick ()
    {
      this.handleClose();
    },

    handleClose ()
    {
      this.$emit( 'close' );
    },

    handleSubmit ()
    {
      if ( !this.formData.month )
      {
        uni.showToast( {
          title: '请选择月份',
          icon: 'none'
        } );
        return;
      }

      if ( !this.formData.totalBudget || parseFloat( this.formData.totalBudget ) <= 0 )
      {
        uni.showToast( {
          title: '请输入有效的月度总预算',
          icon: 'none'
        } );
        return;
      }

      this.isLoading = true;

      const submitData = {
        month: this.formData.month,
        totalBudget: parseFloat( this.formData.totalBudget ),
        categoryBudgets: this.formData.categoryBudgets
          .filter( cb => cb.budget && parseFloat( cb.budget ) > 0 )
          .map( cb => ( {
            categoryId: cb.categoryId,
            budget: parseFloat( cb.budget )
          } ) )
      };

      budgetApi.create( submitData ).then( res =>
      {
        this.isLoading = false;
        if ( res.success )
        {
          uni.showToast( {
            title: '预算设置成功',
            icon: 'success'
          } );
          this.$emit( 'success' );
          this.handleClose();
        } else
        {
          uni.showToast( {
            title: res.message || '设置失败',
            icon: 'none'
          } );
        }
      } ).catch( err =>
      {
        this.isLoading = false;
        uni.showToast( {
          title: '设置失败，请重试',
          icon: 'none'
        } );
        console.error( '预算设置失败:', err );
      } );
    }
  }
};
</script>

<style scoped>
.budget-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
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

.budget-form-container {
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

.picker-input {
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
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

.category-budgets-section {
  margin-top: 32rpx;
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 400;
  color: #333333;
  margin-bottom: 8rpx;
}

.section-tip {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-icon {
  font-size: 32rpx;
}

.category-name {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.category-budget-input {
  width: 160rpx;
  padding: 12rpx 16rpx;
  background-color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 26rpx;
  text-align: right;
  color: #333333;
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