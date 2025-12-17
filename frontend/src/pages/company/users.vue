<template>
  <view class="users-page">
    <view class="page-header">
      <text class="page-title">人员管理</text>
      <view class="header-actions">
        <view class="action-button" @click=" showCreateUserModal ">
          <text class="action-icon">+</text>
          <text class="action-text">添加人员</text>
        </view>
      </view>
    </view>

    <view class="filter-section">
      <view class="filter-item">
        <picker :range=" roleFilterOptions " :value=" selectedRoleIndex " @change=" onRoleFilterChange ">
          <view class="picker-input">
            <text>{{ roleFilterOptions[ selectedRoleIndex ] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <scroll-view class="users-list" scroll-y>
      <view class="user-card" v-for=" user in filteredUsers " :key=" user.id ">
        <view class="user-header">
          <view class="user-avatar" :style=" { backgroundColor: getUserColor( user.id ) } ">
            <text class="avatar-text">{{ user.username }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.username }}</text>
            <text class="user-role">{{ getRoleLabel( user.role ) }}</text>
          </view>
        </view>
        <view class="user-meta">
          <text class="meta-item">创建时间：{{ formatDate( user.created_at ) }}</text>
        </view>
        <view class="user-actions">
          <view class="action-btn edit" @click="editUser( user )">编辑</view>
          <view class="action-btn delete" @click="deleteUser( user )">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if=" filteredUsers.length === 0 ">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无人员</text>
        <text class="empty-tip">点击右上角按钮添加新人员</text>
      </view>
    </scroll-view>

    <view class="user-modal-overlay" v-if=" showUserModal " @click=" handleModalOverlayClick ">
      <view class="user-modal-container" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditMode ? '编辑人员' : '添加人员' }}</text>
          <view class="close-btn" @click=" closeUserModal ">✕</view>
        </view>

        <view class="modal-content">
          <view class="form-group">
            <text class="form-label">用户名</text>
            <input class="form-input" type="text" v-model=" userForm.username " placeholder="请输入用户名"
              :disabled=" isEditMode " />
          </view>

          <view class="form-group" v-if=" !isEditMode ">
            <text class="form-label">密码</text>
            <input class="form-input" type="password" v-model=" userForm.password " placeholder="请输入密码（至少6位）" />
          </view>

          <view class="form-group" v-if=" isEditMode ">
            <text class="form-label">新密码（留空则不修改）</text>
            <input class="form-input" type="password" v-model=" userForm.password " placeholder="请输入新密码" />
          </view>

          <view class="form-group">
            <text class="form-label">角色</text>
            <view class="role-selector">
              <view class="role-option" v-for=" ( role, index ) in roleOptions " :key=" role.value "
                :class=" { active: userForm.role === role.value } " @click="selectRole( role.value )">
                <text class="role-icon">{{ role.icon }}</text>
                <text class="role-label">{{ role.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn btn-cancel" @click=" closeUserModal ">取消</view>
          <view class="btn btn-submit" @click=" submitUserForm ">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { userApi, authApi } from '../../utils/api';
import type { User } from '../../types/index';

export default {
  name: 'UsersPage',
  data ()
  {
    return {
      users: [] as User[],
      showUserModal: false,
      isEditMode: false,
      userForm: {
        id: null as number | null,
        username: '',
        password: '',
        role: 'user'
      },
      selectedRoleIndex: 0,
      roleFilterOptions: [ '全部角色', '资源协调', '技术经理', '顾问', '普通用户' ],
      roleOptions: [
        { label: '资源协调', value: 'resource_coordinator', icon: '👑' },
        { label: '技术经理', value: 'tech_manager', icon: '💼' },
        { label: '顾问', value: 'consultant', icon: '🎓' },
        { label: '普通用户', value: 'user', icon: '👤' }
      ],
      filterRole: '',
      isLoading: false,
      userColors: [ '#6FCF97', '#F2994A', '#BB6BD9', '#56CCF2', '#EB5757' ]
    };
  },
  computed: {
    filteredUsers (): User[]
    {
      if ( !this.filterRole )
      {
        return this.users;
      }
      return this.users.filter( user => user.role === this.filterRole );
    }
  },
  mounted ()
  {
    this.loadUsers();
  },
  methods: {
    loadUsers ()
    {
      userApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.users = res.data.users;
        }
      } ).catch( err =>
      {
        console.error( '加载人员列表失败:', err );
        uni.showToast( {
          title: '加载失败',
          icon: 'none'
        } );
      } );
    },

    onRoleFilterChange ( e: any )
    {
      this.selectedRoleIndex = e.detail.value;
      const roleMap: Record<number, string> = {
        0: '',
        1: 'resource_coordinator',
        2: 'tech_manager',
        3: 'consultant',
        4: 'user'
      };
      this.filterRole = roleMap[ this.selectedRoleIndex ];
    },

    showCreateUserModal ()
    {
      this.isEditMode = false;
      this.userForm = {
        id: null,
        username: '',
        password: '',
        role: 'user'
      };
      this.showUserModal = true;
    },

    editUser ( user: User )
    {
      this.isEditMode = true;
      this.userForm = {
        id: user.id || null,
        username: user.username,
        password: '',
        role: user.role
      };
      this.showUserModal = true;
    },

    deleteUser ( user: User )
    {
      uni.showModal( {
        title: '确认删除',
        content: `确定要删除用户"${ user.username }"吗？此操作不可恢复。`,
        success: ( res ) =>
        {
          if ( res.confirm && user.id )
          {
            userApi.delete( user.id ).then( response =>
            {
              if ( response.success )
              {
                uni.showToast( {
                  title: '删除成功',
                  icon: 'success'
                } );
                this.loadUsers();
              } else
              {
                uni.showToast( {
                  title: response.message || '删除失败',
                  icon: 'none'
                } );
              }
            } ).catch( err =>
            {
              console.error( '删除用户失败:', err );
              uni.showToast( {
                title: '删除失败',
                icon: 'none'
              } );
            } );
          }
        }
      } );
    },

    selectRole ( role: string )
    {
      this.userForm.role = role;
    },

    handleModalOverlayClick ()
    {
      this.closeUserModal();
    },

    closeUserModal ()
    {
      this.showUserModal = false;
    },

    submitUserForm ()
    {
      if ( !this.userForm.username.trim() )
      {
        uni.showToast( {
          title: '请输入用户名',
          icon: 'none'
        } );
        return;
      }

      if ( this.userForm.username.trim().length < 3 )
      {
        uni.showToast( {
          title: '用户名至少3个字符',
          icon: 'none'
        } );
        return;
      }

      if ( !this.isEditMode )
      {
        if ( !this.userForm.password || this.userForm.password.length < 6 )
        {
          uni.showToast( {
            title: '密码至少6位',
            icon: 'none'
          } );
          return;
        }
      }

      this.isLoading = true;

      const submitData: any = {
        username: this.userForm.username.trim(),
        role: this.userForm.role
      };

      if ( this.userForm.password )
      {
        submitData.password = this.userForm.password;
      }

      const apiCall = this.isEditMode && this.userForm.id
        ? userApi.update( this.userForm.id, submitData )
        : authApi.register( submitData );

      apiCall.then( res =>
      {
        this.isLoading = false;
        if ( res.success )
        {
          uni.showToast( {
            title: this.isEditMode ? '更新成功' : '添加成功',
            icon: 'success'
          } );
          this.closeUserModal();
          this.loadUsers();
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
        console.error( '提交用户信息失败:', err );
        uni.showToast( {
          title: '操作失败',
          icon: 'none'
        } );
      } );
    },

    getRoleLabel ( role: string ): string
    {
      const roleMap: Record<string, string> = {
        resource_coordinator: '资源协调',
        tech_manager: '技术经理',
        consultant: '顾问',
        user: '普通用户'
      };
      return roleMap[ role ] || role;
    },

    getUserColor ( userId?: number ): string
    {
      if ( !userId ) return this.userColors[ 0 ];
      return this.userColors[ userId % this.userColors.length ];
    },

    formatDate ( dateString?: string ): string
    {
      if ( !dateString ) return '';
      const date = new Date( dateString );
      const year = date.getFullYear();
      const month = String( date.getMonth() + 1 ).padStart( 2, '0' );
      const day = String( date.getDate() ).padStart( 2, '0' );
      return `${ year }-${ month }-${ day }`;
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

.users-page {
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

.header-actions {
  display: flex;
  gap: 16rpx;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background-color: #6FCF97;
  border-radius: 8rpx;
  cursor: pointer;
}

.action-icon {
  font-size: 32rpx;
  color: #FFFFFF;
}

.action-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #FFFFFF;
}

.filter-section {
  margin-bottom: 24rpx;
}

.filter-item {
  width: 100%;
}

.picker-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333333;
}

.arrow {
  font-size: 20rpx;
  color: #828282;
}

.users-list {
  max-height: calc(100vh - 280rpx);
}

.user-card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.user-avatar {
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

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.user-role {
  font-size: 24rpx;
  font-weight: 300;
  color: #6FCF97;
}

.user-meta {
  padding-top: 16rpx;
  border-top: 1rpx solid #F2F2F2;
  margin-bottom: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.user-actions {
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
  padding: 120rpx 32rpx;
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

.user-modal-overlay {
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

.user-modal-container {
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

.modal-header {
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #F2F2F2;
}

.modal-title {
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

.modal-content {
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

.role-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.role-option {
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

.role-option.active {
  background-color: #6FCF97;
}

.role-option.active .role-label {
  color: #FFFFFF;
}

.role-icon {
  font-size: 40rpx;
}

.role-label {
  font-size: 24rpx;
  font-weight: 300;
  color: #333333;
}

.modal-actions {
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