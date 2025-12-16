<template>
  <view class="login-page">
    <view class="login-container">
      <view class="login-header">
        <text class="app-title">记账助手 By HAISNAP</text>
        <text class="app-subtitle">公司管理平台</text>
      </view>

      <view class="login-form">
        <view class="form-group">
          <view class="input-wrapper">
            <text class="input-icon">👤</text>
            <input class="form-input" type="text" v-model=" formData.username " placeholder="请输入用户名"
              @input=" clearError " />
          </view>
        </view>

        <view class="form-group">
          <view class="input-wrapper">
            <text class="input-icon">🔒</text>
            <input class="form-input" :type=" showPassword ? 'text' : 'password' " v-model=" formData.password "
              placeholder="请输入密码" @input=" clearError " />
            <text class="toggle-password" @click=" togglePassword ">
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </text>
          </view>
        </view>

        <view class="form-group" v-if=" isRegisterMode ">
          <view class="input-wrapper">
            <text class="input-icon">🔑</text>
            <input class="form-input" :type=" showConfirmPassword ? 'text' : 'password' "
              v-model=" formData.confirmPassword " placeholder="请确认密码" @input=" clearError " />
            <text class="toggle-password" @click=" toggleConfirmPassword ">
              {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
            </text>
          </view>
        </view>

        <view class="form-group" v-if=" isRegisterMode ">
          <view class="role-selector">
            <text class="role-label">选择角色</text>
            <view class="role-options">
              <view class="role-option" v-for=" role in roleOptions " :key=" role.value "
                :class=" { active: formData.role === role.value } " @click="selectRole( role.value )">
                <text class="role-icon">{{ role.icon }}</text>
                <text class="role-text">{{ role.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="error-message" v-if=" errorMessage ">
          <text class="error-text">{{ errorMessage }}</text>
        </view>

        <view class="form-actions">
          <button class="btn btn-primary" :class=" { loading: isLoading } " @click=" handleSubmit "
            :disabled=" isLoading ">
            {{ isLoading ? '处理中...' : ( isRegisterMode ? '注册' : '登录' ) }}
          </button>
        </view>

        <view class="form-footer">
          <text class="toggle-mode" @click=" toggleMode ">
            {{ isRegisterMode ? '已有账号？立即登录' : '没有账号？立即注册' }}
          </text>
        </view>

        <view class="default-accounts" v-if=" !isRegisterMode ">
          <text class="accounts-title">默认账号</text>
          <view class="account-list">
            <view class="account-item" v-for=" account in defaultAccounts " :key=" account.username "
              @click="useDefaultAccount( account )">
              <text class="account-username">{{ account.username }}</text>
              <text class="account-role">{{ account.roleLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { authApi } from '../../utils/api';

export default {
  name: 'LoginPage',
  data ()
  {
    return {
      isRegisterMode: false,
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false,
      errorMessage: '',
      formData: {
        username: '',
        password: '',
        confirmPassword: '',
        role: 'user'
      },
      roleOptions: [
        { label: '资源协调', value: 'resource_coordinator', icon: '👑' },
        { label: '技术经理', value: 'tech_manager', icon: '💼' },
        { label: '顾问', value: 'consultant', icon: '🎓' },
        { label: '普通用户', value: 'user', icon: '👤' }
      ],
      defaultAccounts: [
        { username: 'admin', password: '123456', roleLabel: '资源协调' },
        { username: 'user1', password: '123456', roleLabel: '技术经理' },
        { username: 'user2', password: '123456', roleLabel: '顾问' }
      ]
    };
  },
  methods: {
    toggleMode ()
    {
      this.isRegisterMode = !this.isRegisterMode;
      this.clearForm();
    },

    togglePassword ()
    {
      this.showPassword = !this.showPassword;
    },

    toggleConfirmPassword ()
    {
      this.showConfirmPassword = !this.showConfirmPassword;
    },

    selectRole ( role: string )
    {
      this.formData.role = role;
    },

    clearError ()
    {
      this.errorMessage = '';
    },

    clearForm ()
    {
      this.formData = {
        username: '',
        password: '',
        confirmPassword: '',
        role: 'user'
      };
      this.errorMessage = '';
    },

    useDefaultAccount ( account: any )
    {
      this.formData.username = account.username;
      this.formData.password = account.password;
      this.handleSubmit();
    },

    validateForm (): boolean
    {
      if ( !this.formData.username.trim() )
      {
        this.errorMessage = '请输入用户名';
        return false;
      }

      if ( this.formData.username.trim().length < 3 )
      {
        this.errorMessage = '用户名至少3个字符';
        return false;
      }

      if ( !this.formData.password )
      {
        this.errorMessage = '请输入密码';
        return false;
      }

      if ( this.formData.password.length < 6 )
      {
        this.errorMessage = '密码至少6位';
        return false;
      }

      if ( this.isRegisterMode )
      {
        if ( !this.formData.confirmPassword )
        {
          this.errorMessage = '请确认密码';
          return false;
        }

        if ( this.formData.password !== this.formData.confirmPassword )
        {
          this.errorMessage = '两次密码输入不一致';
          return false;
        }
      }

      return true;
    },

    async handleSubmit ()
    {
      if ( !this.validateForm() )
      {
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';

      try
      {
        const apiCall = this.isRegisterMode
          ? authApi.register( {
            username: this.formData.username.trim(),
            password: this.formData.password,
            role: this.formData.role
          } )
          : authApi.login( {
            username: this.formData.username.trim(),
            password: this.formData.password
          } );

        const response = await apiCall;

        if ( response.success && response.data )
        {
          uni.setStorageSync( 'userInfo', {
            id: response.data.id,
            username: response.data.username,
            role: response.data.role
          } );
          uni.setStorageSync( 'token', response.data.token );

          uni.showToast( {
            title: this.isRegisterMode ? '注册成功' : '登录成功',
            icon: 'success',
            duration: 1500
          } );

          setTimeout( () =>
          {
            uni.reLaunch( {
              url: '/pages/company/index'
            } );
          }, 1500 );
        } else
        {
          this.errorMessage = response.message || ( this.isRegisterMode ? '注册失败' : '登录失败' );
        }
      } catch ( error: any )
      {
        console.error( '操作失败:', error );
        this.errorMessage = error.message || '网络请求失败，请重试';
      } finally
      {
        this.isLoading = false;
      }
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

.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.login-container {
  width: 100%;
  max-width: 600rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.2);
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-40rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 48rpx;
}

.app-title {
  display: block;
  font-size: 48rpx;
  font-weight: 400;
  color: #333333;
  margin-bottom: 8rpx;
}

.app-subtitle {
  display: block;
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
}

.login-form {
  width: 100%;
}

.form-group {
  margin-bottom: 32rpx;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background-color: #F2F2F2;
  border-radius: 12rpx;
  padding: 0 24rpx;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  background-color: #E8E8E8;
  box-shadow: 0 0 0 4rpx rgba(111, 207, 151, 0.2);
}

.input-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.form-input {
  flex: 1;
  padding: 24rpx 0;
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
  background-color: transparent;
  border: none;
}

.toggle-password {
  font-size: 32rpx;
  cursor: pointer;
  padding: 8rpx;
}

.role-selector {
  width: 100%;
}

.role-label {
  display: block;
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
  margin-bottom: 16rpx;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.role-option {
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.role-option.active {
  background-color: #6FCF97;
  transform: scale(1.05);
}

.role-option.active .role-text {
  color: #FFFFFF;
}

.role-icon {
  font-size: 40rpx;
}

.role-text {
  font-size: 24rpx;
  font-weight: 300;
  color: #333333;
}

.error-message {
  margin-bottom: 24rpx;
  padding: 16rpx 24rpx;
  background-color: #FFEBEE;
  border-radius: 8rpx;
}

.error-text {
  font-size: 24rpx;
  font-weight: 300;
  color: #EB5757;
  text-align: center;
  display: block;
}

.form-actions {
  margin-bottom: 24rpx;
}

.btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 300;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background-color: #6FCF97;
  color: #FFFFFF;
}

.btn-primary:active {
  background-color: #5AB57E;
  transform: scale(0.98);
}

.btn.loading {
  opacity: 0.6;
  pointer-events: none;
}

.form-footer {
  text-align: center;
  margin-bottom: 32rpx;
}

.toggle-mode {
  font-size: 28rpx;
  font-weight: 300;
  color: #6FCF97;
  cursor: pointer;
  text-decoration: underline;
}

.default-accounts {
  padding-top: 32rpx;
  border-top: 1rpx solid #F2F2F2;
}

.accounts-title {
  display: block;
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
  text-align: center;
  margin-bottom: 16rpx;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.account-item:active {
  background-color: #E8E8E8;
  transform: scale(0.98);
}

.account-username {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.account-role {
  font-size: 24rpx;
  font-weight: 300;
  color: #6FCF97;
}
</style>