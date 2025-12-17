<template>
  <view class="projects-page">
    <view class="page-header">
      <text class="page-title">项目管理</text>
      <view class="header-actions">
        <view class="action-button" @click=" showCreateProjectModal ">
          <text class="action-icon">+</text>
          <text class="action-text">新建项目</text>
        </view>
      </view>
    </view>

    <view class="filter-section">
      <view class="filter-item">
        <picker :range=" statusFilterOptions " :value=" selectedStatusIndex " @change=" onStatusFilterChange ">
          <view class="picker-input">
            <text>{{ statusFilterOptions[ selectedStatusIndex ] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <scroll-view class="projects-list" scroll-y>
      <view class="project-card" v-for=" project in filteredProjects " :key=" project.id "
        @click="viewProjectDetail( project )">
        <view class="project-header">
          <view class="project-info">
            <text class="project-name">{{ project.name }}</text>
            <text class="project-creator">创建人：{{ project.creator_name || '未知' }}</text>
          </view>
          <view class="project-status" :class=" getStatusClass( project.status ) ">
            {{ getStatusLabel( project.status ) }}
          </view>
        </view>
        <view class="project-body">
          <text class="project-description">{{ project.description || '暂无描述' }}</text>
        </view>
        <view class="project-meta">
          <text class="meta-item" v-if=" project.start_date ">开始：{{ project.start_date }}</text>
          <text class="meta-item" v-if=" project.end_date ">结束：{{ project.end_date }}</text>
        </view>
        <view class="project-actions">
          <view class="action-btn edit" @click.stop="editProject( project )">编辑</view>
          <view class="action-btn delete" @click.stop="deleteProject( project )">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if=" filteredProjects.length === 0 ">
        <text class="empty-icon">📁</text>
        <text class="empty-text">暂无项目</text>
        <text class="empty-tip">点击右上角按钮创建新项目</text>
      </view>
    </scroll-view>

    <view class="project-modal-overlay" v-if=" showProjectModal " @click=" handleModalOverlayClick ">
      <view class="project-modal-container" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditMode ? '编辑项目' : '新建项目' }}</text>
          <view class="close-btn" @click=" closeProjectModal ">✕</view>
        </view>

        <view class="modal-content">
          <view class="form-group">
            <text class="form-label">项目名称</text>
            <input class="form-input" type="text" v-model=" projectForm.name " placeholder="请输入项目名称" />
          </view>

          <view class="form-group">
            <text class="form-label">项目描述</text>
            <textarea class="form-textarea" v-model=" projectForm.description " placeholder="请输入项目描述（可选）"
              maxlength="500" />
          </view>

          <view class="form-group">
            <text class="form-label">项目状态</text>
            <view class="status-selector">
              <view class="status-option" v-for=" ( status, index ) in statusOptions " :key=" status.value "
                :class=" { active: projectForm.status === status.value } " @click="selectStatus( status.value )">
                <text class="status-text">{{ status.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">开始日期</text>
            <picker mode="date" :value=" projectForm.start_date " @click=" onClickDatePicker "
              @change=" onStartDateChange ">
              <view class="picker-input">
                <text>{{ projectForm.start_date || '请选择开始日期' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="form-label">结束日期</text>
            <picker mode="date" :value=" projectForm.end_date " @change=" onEndDateChange ">
              <view class="picker-input">
                <text>{{ projectForm.end_date || '请选择结束日期' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn btn-cancel" @click=" closeProjectModal ">取消</view>
          <view class="btn btn-submit" @click=" submitProjectForm ">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { projectApi } from '../../utils/api';
import type { Project } from '../../types/index';

export default {
  name: 'ProjectsPage',
  data ()
  {
    return {
      projects: [] as Project[],
      showProjectModal: false,
      isEditMode: false,
      projectForm: {
        id: null as number | null,
        name: '',
        description: '',
        status: 'planning',
        start_date: '',
        end_date: ''
      },
      selectedStatusIndex: 0,
      statusFilterOptions: [ '全部状态', '规划中', '进行中', '已完成', '已暂停', '已取消' ],
      statusOptions: [
        { label: '规划中', value: 'planning' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已暂停', value: 'suspended' },
        { label: '已取消', value: 'cancelled' }
      ],
      filterStatus: '',
      isLoading: false
    };
  },
  computed: {
    filteredProjects (): Project[]
    {
      if ( !this.filterStatus )
      {
        return this.projects;
      }
      return this.projects.filter( project => project.status === this.filterStatus );
    }
  },
  mounted ()
  {
    this.loadProjects();
  },
  methods: {
    loadProjects ()
    {
      projectApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.projects = res.data;
        }
      } ).catch( err =>
      {
        console.error( '加载项目列表失败:', err );
        uni.showToast( {
          title: '加载失败',
          icon: 'none'
        } );
      } );
    },

    onStatusFilterChange ( e: any )
    {
      this.selectedStatusIndex = e.detail.value;
      const statusMap: Record<number, string> = {
        0: '',
        1: 'planning',
        2: 'in_progress',
        3: 'completed',
        4: 'suspended',
        5: 'cancelled'
      };
      this.filterStatus = statusMap[ this.selectedStatusIndex ];
    },

    showCreateProjectModal ()
    {
      const userInfo = uni.getStorageSync( 'userInfo' );
      if ( !userInfo || !userInfo.id )
      {
        uni.showToast( {
          title: '请先登录',
          icon: 'none'
        } );
        uni.navigateTo( {
          url: '/pages/login/index'
        } );
        return;
      }

      this.isEditMode = false;
      this.projectForm = {
        id: null,
        name: '',
        description: '',
        status: 'planning',
        start_date: '',
        end_date: ''
      };
      this.showProjectModal = true;
    },

    editProject ( project: Project )
    {
      this.isEditMode = true;
      this.projectForm = {
        id: project.id || null,
        name: project.name,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || ''
      };
      this.showProjectModal = true;
    },

    deleteProject ( project: Project )
    {
      uni.showModal( {
        title: '确认删除',
        content: `确定要删除项目"${ project.name }"吗？`,
        success: ( res ) =>
        {
          if ( res.confirm && project.id )
          {
            projectApi.delete( project.id ).then( response =>
            {
              if ( response.success )
              {
                uni.showToast( {
                  title: '删除成功',
                  icon: 'success'
                } );
                this.loadProjects();
              } else
              {
                uni.showToast( {
                  title: response.message || '删除失败',
                  icon: 'none'
                } );
              }
            } ).catch( err =>
            {
              console.error( '删除项目失败:', err );
              uni.showToast( {
                title: '删除失败',
                icon: 'none'
              } );
            } );
          }
        }
      } );
    },

    viewProjectDetail ( project: Project )
    {
      uni.navigateTo( {
        url: `/pages/projects/detail?id=${ project.id }`
      } );
    },

    selectStatus ( status: string )
    {
      this.projectForm.status = status;
    },

    onStartDateChange ( e: any )
    {
      this.projectForm.start_date = e.detail.value;
    },
    onClickDatePicker ( e: any )
    {
      // this.showProjectModal = false;
    },
    onEndDateChange ( e: any )
    {
      this.projectForm.end_date = e.detail.value;
    },

    handleModalOverlayClick ()
    {
      // this.closeProjectModal();
    },

    closeProjectModal ()
    {
      this.showProjectModal = false;
    },

    submitProjectForm ()
    {
      if ( !this.projectForm.name.trim() )
      {
        uni.showToast( {
          title: '请输入项目名称',
          icon: 'none'
        } );
        return;
      }

      const userInfo = uni.getStorageSync( 'userInfo' );
      if ( !userInfo || !userInfo.id )
      {
        uni.showToast( {
          title: '用户信息已失效，请重新登录',
          icon: 'none'
        } );
        return;
      }

      this.isLoading = true;

      const submitData: any = {
        name: this.projectForm.name.trim(),
        description: this.projectForm.description.trim(),
        status: this.projectForm.status,
        start_date: this.projectForm.start_date || undefined,
        end_date: this.projectForm.end_date || undefined
      };

      if ( !this.isEditMode )
      {
        submitData.created_by = userInfo.id;
      }

      const apiCall = this.isEditMode && this.projectForm.id
        ? projectApi.update( this.projectForm.id, submitData )
        : projectApi.create( submitData );

      apiCall.then( res =>
      {
        this.isLoading = false;
        if ( res.success )
        {
          uni.showToast( {
            title: this.isEditMode ? '更新成功' : '创建成功',
            icon: 'success'
          } );
          this.closeProjectModal();
          this.loadProjects();
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
        console.error( '提交项目失败:', err );
        uni.showToast( {
          title: '操作失败',
          icon: 'none'
        } );
      } );
    },

    getStatusLabel ( status: string ): string
    {
      const statusMap: Record<string, string> = {
        planning: '规划中',
        in_progress: '进行中',
        completed: '已完成',
        suspended: '已暂停',
        cancelled: '已取消'
      };
      return statusMap[ status ] || status;
    },

    getStatusClass ( status: string ): string
    {
      return `status-${ status }`;
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

.projects-page {
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

.projects-list {
  max-height: calc(100vh - 280rpx);
}

.project-card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.project-name {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.project-creator {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.project-status {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
  font-weight: 300;
}

.status-planning {
  background-color: #FFF3E0;
  color: #F2994A;
}

.status-in_progress {
  background-color: #E3F2FD;
  color: #2196F3;
}

.status-completed {
  background-color: #E8F5E9;
  color: #4CAF50;
}

.status-suspended {
  background-color: #FFF9C4;
  color: #FBC02D;
}

.status-cancelled {
  background-color: #FFEBEE;
  color: #F44336;
}

.project-body {
  margin-bottom: 16rpx;
}

.project-description {
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
  line-height: 1.5;
}

.project-meta {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F2F2F2;
  margin-bottom: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.project-actions {
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

.project-modal-overlay {
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

.project-modal-container {
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

.status-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.status-option {
  padding: 24rpx;
  text-align: center;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.status-option.active {
  background-color: #6FCF97;
}

.status-option.active .status-text {
  color: #FFFFFF;
}

.status-text {
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
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