<script lang="ts">
interface UserState
{
  id: number | null;
  username: string;
  role: string;
  token: string;
  isLoggedIn: boolean;
}
// const BASE_URL = 'https://hmwork.tutlab.tech';
const BASE_URL = 'http://localhost:20261';
export default {
  name: 'App',
  data ()
  {
    return {
      userState: {
        id: null,
        username: '',
        role: '',
        token: '',
        isLoggedIn: false
      } as UserState
    };
  },
  onLaunch ()
  {
    console.log( '应用启动' );
    this.initUserState();
    // 启动时处理默认跳转逻辑
    this.handleStartup();
  },
  onShow ()
  {
    console.log( '应用显示' );
    this.checkLoginStatus();
  },
  onHide ()
  {
    console.log( '应用隐藏' );
  },
  methods: {
    initUserState ()
    {
      try
      {
        const userInfo = uni.getStorageSync( 'userInfo' );
        const token = uni.getStorageSync( 'token' );

        if ( userInfo && token )
        {
          this.userState = {
            id: userInfo.id,
            username: userInfo.username,
            role: userInfo.role,
            token: token,
            isLoggedIn: true
          };

          getApp().globalData = {
            ...getApp().globalData,
            userInfo: this.userState
          };
        }
      } catch ( e )
      {
        console.error( '初始化用户状态失败:', e );
      }
    },

    async handleStartup ()
    {
      // 1. 如果本地已经有登录态，直接跳转到首页
      if ( this.userState.isLoggedIn )
      {
        this.navigateToHome();
        return;
      }

      // 2. 如果没有登录态，尝试自动登录
      await this.autoLogin();
    },

    async autoLogin ()
    {
      try
      {
        console.log( '尝试自动登录...' );
        const response = await uni.request( {
          url: `${ BASE_URL }/api/auth/auto-login`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          }
        } );

        const data = response.data as any;
        if ( data.success && data.data )
        {
          console.log( '自动登录成功' );
          // 保存登录信息
          this.login( data.data );
          // 跳转到首页
          this.navigateToHome();
        } else
        {
          console.log( '自动登录失败，跳转登录页' );
          this.navigateToLogin();
        }
      } catch ( error )
      {
        console.error( '自动登录异常:', error );
        this.navigateToLogin();
      }
    },

    navigateToHome ()
    {
      // 默认跳转到公司管理首页，如果失败则跳转到华梦沃客首页
      uni.reLaunch( {
        url: '/pages/company/index',
        fail: () =>
        {
          uni.reLaunch( { url: '/pages/index/index' } );
        }
      } );
    },

    navigateToLogin ()
    {
      uni.reLaunch( {
        url: '/pages/login/index'
      } );
    },

    checkLoginStatus ()
    {
      const pages = getCurrentPages();
      const currentPage = pages[ pages.length - 1 ];
      const currentRoute = currentPage ? currentPage.route : '';

      const publicRoutes = [
        'pages/index/index',
        'pages/login/index'
      ];

      const isPublicRoute = publicRoutes.some( route => currentRoute?.includes( route ) );

      if ( !this.userState.isLoggedIn && !isPublicRoute && currentRoute )
      {
        uni.showToast( {
          title: '请先登录',
          icon: 'none',
          duration: 2000
        } );

        setTimeout( () =>
        {
          this.navigateToLogin();
        }, 2000 );
      }
    },

    login ( userInfo: { id: number; username: string; role: string; token: string } )
    {
      this.userState = {
        id: userInfo.id,
        username: userInfo.username,
        role: userInfo.role,
        token: userInfo.token,
        isLoggedIn: true
      };

      try
      {
        uni.setStorageSync( 'userInfo', {
          id: userInfo.id,
          username: userInfo.username,
          role: userInfo.role
        } );
        uni.setStorageSync( 'token', userInfo.token );

        getApp().globalData = {
          ...getApp().globalData,
          userInfo: this.userState
        };
      } catch ( e )
      {
        console.error( '保存用户信息失败:', e );
      }
    },

    logout ()
    {
      this.userState = {
        id: null,
        username: '',
        role: '',
        token: '',
        isLoggedIn: false
      };

      try
      {
        uni.removeStorageSync( 'userInfo' );
        uni.removeStorageSync( 'token' );

        getApp().globalData = {
          ...getApp().globalData,
          userInfo: null
        };

        this.navigateToLogin();
      } catch ( e )
      {
        console.error( '退出登录失败:', e );
      }
    },

    getUserInfo ()
    {
      return this.userState;
    },

    hasRole ( role: string ): boolean
    {
      return this.userState.role === role;
    },

    hasPermission ( permission: string ): boolean
    {
      const rolePermissions: Record<string, string[]> = {
        resource_coordinator: [ 'view_all', 'create_project', 'assign_task', 'manage_users' ],
        tech_manager: [ 'view_all', 'create_project', 'update_task' ],
        consultant: [ 'view_all', 'update_task' ],
        user: [ 'view_own', 'update_own_task' ]
      };

      const permissions = rolePermissions[ this.userState.role ] || [];
      return permissions.includes( permission );
    }
  }
};
</script>

<style>
page {
  background-color: #F2F2F2;
  font-weight: 300;
  color: #333333;
  line-height: 1.6;
}

uni-input {
  height: auto !important;
  min-height: 0 !important;
  line-height: normal !important;
}

page,
view,
text,
swiper,
swiper-item,
image,
navigator {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

view,
text,
input,
textarea,
button {
  font-family: inherit;
}

button {
  border: none;
  outline: none;
}

button::after {
  border: none;
}

.container {
  min-height: 100vh;
  padding: 32rpx;
}

.page-wrapper {
  background-color: #F2F2F2;
  min-height: 100vh;
}

.text-primary {
  color: #6FCF97;
}

.text-secondary {
  color: #828282;
}

.text-accent {
  color: #F2994A;
}

.text-danger {
  color: #EB5757;
}

.bg-primary {
  background-color: #6FCF97;
}

.bg-secondary {
  background-color: #F2F2F2;
}

.bg-accent {
  background-color: #F2994A;
}

.bg-white {
  background-color: #FFFFFF;
}

.font-light {
  font-weight: 300;
}

.font-normal {
  font-weight: 400;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.flex {
  display: flex;
}

.flex-column {
  flex-direction: column;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

.gap-8 {
  gap: 8rpx;
}

.gap-16 {
  gap: 16rpx;
}

.gap-24 {
  gap: 24rpx;
}

.gap-32 {
  gap: 32rpx;
}

.p-8 {
  padding: 8rpx;
}

.p-16 {
  padding: 16rpx;
}

.p-24 {
  padding: 24rpx;
}

.p-32 {
  padding: 32rpx;
}

.m-8 {
  margin: 8rpx;
}

.m-16 {
  margin: 16rpx;
}

.m-24 {
  margin: 24rpx;
}

.m-32 {
  margin: 32rpx;
}

.mb-8 {
  margin-bottom: 8rpx;
}

.mb-16 {
  margin-bottom: 16rpx;
}

.mb-24 {
  margin-bottom: 24rpx;
}

.mb-32 {
  margin-bottom: 32rpx;
}

.mt-16 {
  margin-top: 16rpx;
}

.mt-24 {
  margin-top: 24rpx;
}

.mt-32 {
  margin-top: 32rpx;
}

.rounded-8 {
  border-radius: 8rpx;
}

.rounded-16 {
  border-radius: 16rpx;
}

.rounded-full {
  border-radius: 50%;
}

.shadow-sm {
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.shadow-md {
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.shadow-lg {
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.btn {
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 300;
  text-align: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:active {
  opacity: 0.8;
}

.btn-primary {
  background-color: #6FCF97;
  color: #FFFFFF;
}

.btn-secondary {
  background-color: #F2F2F2;
  color: #828282;
}

.btn-accent {
  background-color: #F2994A;
  color: #FFFFFF;
}

.btn-danger {
  background-color: #EB5757;
  color: #FFFFFF;
}

.input-field {
  width: 100%;
  padding: 24rpx;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.overlay {
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
}

.fade-in {
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

.slide-up {
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

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ellipsis-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.divider {
  height: 1rpx;
  background-color: #F2F2F2;
  margin: 16rpx 0;
}
</style>