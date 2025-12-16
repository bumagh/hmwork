<template>
  <view class="transaction-form-overlay" v-if=" visible " @click=" handleOverlayClick ">
    <view class="transaction-form-container" @click.stop>
      <view class="form-header">
        <text class="form-title">{{ isEdit ? '编辑记录' : '新增记录' }}</text>
        <view class="close-btn" @click=" handleClose ">✕</view>
      </view>

      <view class="form-content">
        <view class="type-selector">
          <view class="type-option" :class=" { active: formData.type === 'expense' } " @click="selectType( 'expense' )">
            <text class="type-text">支出</text>
          </view>
          <view class="type-option" :class=" { active: formData.type === 'income' } " @click="selectType( 'income' )">
            <text class="type-text">收入</text>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">金额（¥）</text>
          <input class="form-input amount-input" type="digit" :value=" formData.amount " @input=" onAmountInput "
            placeholder="请输入金额" />
        </view>

        <view class="form-group">
          <text class="form-label">分类</text>
          <view class="category-selector">
            <view class="category-item" v-for=" category in filteredCategories " :key=" category.id "
              :class=" { selected: formData.categoryId === category.id } " @click="selectCategory( category.id )">
              <text class="category-icon">{{ category.icon }}</text>
              <text class="category-name">{{ category.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">日期</text>
          <picker mode="date" :value=" formData.date " @change=" onDateChange ">
            <view class="picker-input">
              <text>{{ formData.date || '请选择日期' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="form-label">备注</text>
          <textarea class="form-textarea" :value=" formData.note " @input=" onNoteInput " placeholder="备注信息（可选）"
            maxlength="200" />
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
import { categoryApi, transactionApi, formatDate } from '../utils/api';

export default {
  name: 'TransactionForm',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    transaction: {
      type: Object,
      default: null
    }
  },
  data ()
  {
    return {
      formData: {
        type: 'expense',
        amount: '',
        categoryId: null,
        date: '',
        note: ''
      },
      categories: [],
      isLoading: false
    };
  },
  computed: {
    isEdit ()
    {
      return !!this.transaction;
    },
    filteredCategories ()
    {
      return this.categories.filter( c => c.type === this.formData.type );
    }
  },
  watch: {
    visible ( newVal )
    {
      if ( newVal )
      {
        this.initForm();
        this.loadCategories();
      }
    },
    'formData.type' ()
    {
      if ( !this.filteredCategories.find( c => c.id === this.formData.categoryId ) )
      {
        this.formData.categoryId = null;
      }
    }
  },
  methods: {
    initForm ()
    {
      if ( this.transaction )
      {
        this.formData = {
          type: this.transaction.type,
          amount: String( this.transaction.amount ),
          categoryId: this.transaction.category_id || this.transaction.categoryId,
          date: this.transaction.date,
          note: this.transaction.note || ''
        };
      } else
      {
        this.formData = {
          type: 'expense',
          amount: '',
          categoryId: null,
          date: formatDate( new Date() ),
          note: ''
        };
      }
    },

    loadCategories ()
    {
      categoryApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.categories = res.data;
          if ( !this.formData.categoryId && this.filteredCategories.length > 0 )
          {
            this.formData.categoryId = this.filteredCategories[ 0 ].id;
          }
        }
      } ).catch( err =>
      {
        console.error( '加载分类失败:', err );
      } );
    },

    selectType ( type )
    {
      this.formData.type = type;
    },

    selectCategory ( categoryId )
    {
      this.formData.categoryId = categoryId;
    },

    onAmountInput ( e )
    {
      this.formData.amount = e.detail.value;
    },

    onDateChange ( e )
    {
      this.formData.date = e.detail.value;
    },

    onNoteInput ( e )
    {
      this.formData.note = e.detail.value;
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
      if ( !this.formData.amount || parseFloat( this.formData.amount ) <= 0 )
      {
        uni.showToast( {
          title: '请输入有效金额',
          icon: 'none'
        } );
        return;
      }

      if ( !this.formData.categoryId )
      {
        uni.showToast( {
          title: '请选择分类',
          icon: 'none'
        } );
        return;
      }

      if ( !this.formData.date )
      {
        uni.showToast( {
          title: '请选择日期',
          icon: 'none'
        } );
        return;
      }

      this.isLoading = true;

      const submitData = {
        amount: parseFloat( this.formData.amount ),
        type: this.formData.type,
        categoryId: this.formData.categoryId,
        date: this.formData.date,
        note: this.formData.note.trim()
      };

      const apiCall = this.isEdit
        ? transactionApi.update( this.transaction.id, submitData )
        : transactionApi.create( submitData );

      apiCall.then( res =>
      {
        this.isLoading = false;
        if ( res.success )
        {
          uni.showToast( {
            title: this.isEdit ? '更新成功' : '添加成功',
            icon: 'success'
          } );
          this.$emit( 'success' );
          this.handleClose();
        } else
        {
          uni.showToast( {
            title: res.message || '操作失败',
            icon: 'none'
          } );
        }
      } ).catch( err =>
      {
        this.isLoading = false;
        uni.showToast( {
          title: '操作失败，请重试',
          icon: 'none'
        } );
        console.error( '提交失败:', err );
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

.transaction-form-overlay {
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

.transaction-form-container {
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

.type-selector {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
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

.amount-input {
  font-size: 40rpx;
  font-weight: 400;
  text-align: center;
}

.picker-input {
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.category-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.category-item {
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.category-item.selected {
  background-color: #6FCF97;
}

.category-item.selected .category-name {
  color: #FFFFFF;
}

.category-icon {
  font-size: 40rpx;
}

.category-name {
  font-size: 24rpx;
  font-weight: 300;
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