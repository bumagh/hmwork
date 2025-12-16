<template>
  <view class="company-page">
    <view class="page-header">
      <text class="page-title">公司管理</text>
      <view class="user-info" @click=" showUserMenu ">
        <text class="user-icon">👤</text>
        <text class="username">{{ currentUser.username }}</text>
      </view>
    </view>

    <view class="stats-section">
      <view class="stat-card" @click="navigateTo( '/pages/company/projects' )">
        <view class="stat-icon">📁</view>
        <view class="stat-content">
          <text class="stat-value">{{ projectCount }}</text>
          <text class="stat-label">项目总数</text>
        </view>
      </view>
      <view class="stat-card" @click="navigateTo( '/pages/company/users' )">
        <view class="stat-icon">👥</view>
        <view class="stat-content">
          <text class="stat-value">{{ userCount }}</text>
          <text class="stat-label">团队成员</text>
        </view>
      </view>
      <view class="stat-card" @click="navigateTo( '/pages/company/tasks' )">
        <view class="stat-icon">📋</view>
        <view class="stat-content">
          <text class="stat-value">{{ taskCount }}</text>
          <text class="stat-label">进行中任务</text>
        </view>
      </view>
    </view>

    <view class="quick-actions">
      <text class="section-title">快速操作</text>
      <view class="action-grid">
        <view class="action-item" @click="navigateTo( '/pages/company/projects' )">
          <view class="action-icon-wrapper project">
            <text class="action-icon">📁</text>
          </view>
          <text class="action-text">项目管理</text>
        </view>
        <view class="action-item" @click="navigateTo( '/pages/company/users' )">
          <view class="action-icon-wrapper users">
            <text class="action-icon">👥</text>
          </view>
          <text class="action-text">人员管理</text>
        </view>
        <view class="action-item" @click="navigateTo( '/pages/company/tasks' )">
          <view class="action-icon-wrapper tasks">
            <text class="action-icon">📋</text>
          </view>
          <text class="action-text">任务管理</text>
        </view>
        <view class="action-item" @click="navigateTo( '/pages/index/index' )">
          <view class="action-icon-wrapper finance">
            <text class="action-icon">💰</text>
          </view>
          <text class="action-text">记账助手</text>
        </view>
      </view>
    </view>

    <view class="recent-activities">
      <view class="section-header">
        <text class="section-title">最近动态</text>
      </view>
      <scroll-view class="activity-list" scroll-y>
        <view class="activity-item" v-for=" activity in recentActivities " :key=" activity.id ">
          <view class="activity-icon" :class=" getActivityType( activity.type ) ">
            <text>{{ getActivityIcon( activity.type ) }}</text>
          </view>
          <view class="activity-content">
            <text class="activity-title">{{ activity.title }}</text>
            <text class="activity-time">{{ formatTime( activity.time ) }}</text>
          </view>
        </view>
        <view class="empty-state" v-if=" recentActivities.length === 0 ">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无动态</text>
        </view>
      </scroll-view>
    </view>

    <view class="user-menu-overlay" v-if=" showMenu " @click=" closeUserMenu ">
      <view class="user-menu-container" @click.stop>
        <view class="menu-header">
          <view class="menu-avatar" :style=" { backgroundColor: getUserColor() } ">
            <text class="avatar-text">{{ currentUser.username.charAt( 0 ).toUpperCase() }}</text>
          </view>
          <view class="menu-user-info">
            <text class="menu-username">{{ currentUser.username }}</text>
            <text class="menu-role">{{ getRoleLabel( currentUser.role ) }}</text>
          </view>
        </view>
        <view class="menu-actions">
          <view class="menu-item" @click=" handleLogout ">
            <text class="menu-icon">🚪</text>
            <text class="menu-text">退出登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { projectApi, userApi, taskApi } from '../../utils/api';

export default {
  name: 'CompanyIndexPage',
  data ()
  {
    return {
      currentUser: {
        id: null,
        username: '',
        role: ''
      },
      projectCount: 0,
      userCount: 0,
      taskCount: 0,
      recentActivities: [],
      showMenu: false,
      userColors: [ '#6FCF97', '#F2994A', '#BB6BD9', '#56CCF2', '#EB5757' ]
    };
  },
  mounted ()
  {
    this.loadUserInfo();
    this.loadStatistics();
    this.loadRecentActivities();
  },
  methods: {
    loadUserInfo ()
    {
      try
      {
        const userInfo = uni.getStorageSync( 'userInfo' );
        if ( userInfo )
        {
          this.currentUser = userInfo;
        } else
        {
          this.redirectToLogin();
        }
      } catch ( e )
      {
        console.error( '加载用户信息失败:', e );
        this.redirectToLogin();
      }
    },

    redirectToLogin ()
    {
      uni.showToast( {
        title: '请先登录',
        icon: 'none',
        duration: 2000
      } );
      setTimeout( () =>
      {
        uni.redirectTo( {
          url: '/pages/login/index'
        } );
      }, 2000 );
    },

    loadStatistics ()
    {
      projectApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.projectCount = res.data.length;
        }
      } ).catch( err =>
      {
        console.error( '加载项目统计失败:', err );
      } );

      userApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.userCount = res.data.length;
        }
      } ).catch( err =>
      {
        console.error( '加载用户统计失败:', err );
      } );

      taskApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.taskCount = res.data.filter( t => t.status === 'in_progress' ).length;
        }
      } ).catch( err =>
      {
        console.error( '加载任务统计失败:', err );
      } );
    },

    loadRecentActivities ()
    {
      this.recentActivities = [];
    },

    navigateTo ( url )
    {
      uni.navigateTo( { url } );
    },

    showUserMenu ()
    {
      this.showMenu = true;
    },

    closeUserMenu ()
    {
      this.showMenu = false;
    },

    handleLogout ()
    {
      uni.showModal( {
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: ( res ) =>
        {
          if ( res.confirm )
          {
            try
            {
              uni.removeStorageSync( 'userInfo' );
              uni.removeStorageSync( 'token' );
              uni.reLaunch( {
                url: '/pages/login/index'
              } );
            } catch ( e )
            {
              console.error( '退出登录失败:', e );
            }
          }
        }
      } );
    },

    getRoleLabel ( role )
    {
      const roleMap = {
        resource_coordinator: '资源协调',
        tech_manager: '技术经理',
        consultant: '顾问',
        user: '普通用户'
      };
      return roleMap[ role ] || role;
    },

    getUserColor ()
    {
      if ( !this.currentUser.id ) return this.userColors[ 0 ];
      return this.userColors[ this.currentUser.id % this.userColors.length ];
    },

    getActivityType ( type )
    {
      return `activity-${ type }`;
    },

    getActivityIcon ( type )
    {
      const iconMap = {
        project: '📁',
        task: '📋',
        user: '👤'
      };
      return iconMap[ type ] || '📌';
    },

    formatTime ( time )
    {
      if ( !time ) return '';
      const date = new Date( time );
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor( diff / 60000 );
      const hours = Math.floor( minutes / 60 );
      const days = Math.floor( hours / 24 );

      if ( days > 0 ) return `${ days }天前`;
      if ( hours > 0 ) return `${ hours }小时前`;
      if ( minutes > 0 ) return `${ minutes }分钟前`;
      return '刚刚';
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

.company-page {
  min-height: 100vh;
  background-color: #F2F2F2;
}

.page-header {
  background-color: #FFFFFF;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.page-title {
  font-size: 40rpx;
  font-weight: 400;
  color: #333333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #F2F2F2;
  border-radius: 24rpx;
  cursor: pointer;
}

.user-icon {
  font-size: 32rpx;
}

.username {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.stats-section {
  padding: 32rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-icon {
  font-size: 48rpx;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 400;
  color: #6FCF97;
}

.stat-label {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.quick-actions {
  padding: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  cursor: pointer;
}

.action-icon-wrapper {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.action-icon-wrapper.project {
  background-color: #E3F2FD;
}

.action-icon-wrapper.users {
  background-color: #E8F5E9;
}

.action-icon-wrapper.tasks {
  background-color: #FFF3E0;
}

.action-icon-wrapper.finance {
  background-color: #F3E5F5;
}

.action-icon {
  font-size: 48rpx;
}

.action-text {
  font-size: 24rpx;
  font-weight: 300;
  color: #333333;
  text-align: center;
}

.recent-activities {
  padding: 32rpx;
}

.section-header {
  margin-bottom: 24rpx;
}

.activity-list {
  max-height: 600rpx;
}

.activity-item {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.activity-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.activity-icon.activity-project {
  background-color: #E3F2FD;
}

.activity-icon.activity-task {
  background-color: #FFF3E0;
}

.activity-icon.activity-user {
  background-color: #E8F5E9;
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.activity-title {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}

.activity-time {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
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
  color: #828282;
}

.user-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 96rpx 32rpx 32rpx;
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

.user-menu-container {
  width: 400rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-20rpx);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.menu-header {
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background-color: #F2F2F2;
}

.menu-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: 400;
  color: #FFFFFF;
}

.menu-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.menu-username {
  font-size: 28rpx;
  font-weight: 400;
  color: #333333;
}

.menu-role {
  font-size: 24rpx;
  font-weight: 300;
  color: #6FCF97;
}

.menu-actions {
  padding: 16rpx 0;
}

.menu-item {
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:active {
  background-color: #F2F2F2;
}

.menu-icon {
  font-size: 32rpx;
}

.menu-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #333333;
}
</style>