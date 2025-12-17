<template>
  <view class="tasks-page">
    <view class="page-header">
      <text class="page-title">任务管理</text>
      <view class="header-actions">
        <view class="action-button" @click=" showCreateTaskModal ">
          <text class="action-icon">+</text>
          <text class="action-text">新建任务</text>
        </view>
      </view>
    </view>

    <view class="filter-section">
      <view class="filter-item">
        <picker :range=" statusOptions " :value=" selectedStatusIndex " @change=" onStatusChange ">
          <view class="picker-input">
            <text>{{ statusOptions[ selectedStatusIndex ] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="filter-item">
        <picker :range=" priorityOptions " :value=" selectedPriorityIndex " @change=" onPriorityChange ">
          <view class="picker-input">
            <text>{{ priorityOptions[ selectedPriorityIndex ] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <scroll-view class="tasks-list" scroll-y>
      <view class="task-card" v-for=" task in filteredTasks " :key=" task.id " @click="viewTaskDetail( task )">
        <view class="task-header">
          <view class="task-info">
            <text class="task-name">{{ task.name }}</text>
            <text class="project-name">{{ task.project_name || '未关联项目' }}</text>
          </view>
          <view class="task-priority" :class=" getPriorityClass( task.priority ) ">
            {{ getPriorityLabel( task.priority ) }}
          </view>
        </view>
        <view class="task-body">
          <text class="task-description">{{ task.description || '暂无描述' }}</text>
        </view>
        <view class="task-footer">
          <view class="task-meta">
            <text class="meta-item">👤 {{ task.assigned_user_name || '未分配' }}</text>
            <text class="meta-item" v-if=" task.due_date ">📅 {{ task.due_date }}</text>
          </view>
          <view class="task-status" :class=" getStatusClass( task.status ) ">
            {{ getStatusLabel( task.status ) }}
          </view>
        </view>
        <view class="task-actions">
          <view class="action-btn edit" @click.stop="editTask( task )">编辑</view>
          <view class="action-btn delete" @click.stop="deleteTask( task )">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if=" filteredTasks.length === 0 ">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无任务</text>
        <text class="empty-tip">点击右上角按钮创建新任务</text>
      </view>
    </scroll-view>

    <view class="task-modal-overlay" v-if=" showTaskModal " @click=" handleModalOverlayClick ">
      <view class="task-modal-container" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditMode ? '编辑任务' : '新建任务' }}</text>
          <view class="close-btn" @click=" closeTaskModal ">✕</view>
        </view>

        <view class="modal-content">
          <view class="form-group">
            <text class="form-label">任务名称</text>
            <input class="form-input" type="text" v-model=" taskForm.name " placeholder="请输入任务名称" />
          </view>

          <view class="form-group">
            <text class="form-label">任务描述</text>
            <textarea class="form-textarea" v-model=" taskForm.description " placeholder="请输入任务描述（可选）"
              maxlength="500" />
          </view>

          <view class="form-group">
            <text class="form-label">所属项目</text>
            <picker :range=" projects " range-key="name" :value=" selectedProjectIndex " @change=" onProjectChange ">
              <view class="picker-input">
                <text>{{ projects[ selectedProjectIndex ]?.name || '请选择项目' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="form-label">分配给</text>
            <picker :range=" users " range-key="username" :value=" selectedUserIndex " @change=" onUserChange ">
              <view class="picker-input">
                <text>{{ users[ selectedUserIndex ]?.username || '请选择人员' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="form-label">任务状态</text>
            <view class="status-selector">
              <view class="status-option" v-for=" ( status, index ) in taskStatusOptions " :key=" status.value "
                :class=" { active: taskForm.status === status.value } " @click="selectStatus( status.value )">
                <text class="status-text">{{ status.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">优先级</text>
            <view class="priority-selector">
              <view class="priority-option" v-for=" ( priority, index ) in taskPriorityOptions " :key=" priority.value "
                :class=" { active: taskForm.priority === priority.value } " @click="selectPriority( priority.value )">
                <text class="priority-text">{{ priority.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">截止日期</text>
            <picker mode="date" :value=" taskForm.due_date " @change=" onDueDateChange ">
              <view class="picker-input">
                <text>{{ taskForm.due_date || '请选择截止日期' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn btn-cancel" @click=" closeTaskModal ">取消</view>
          <view class="btn btn-submit" @click=" submitTaskForm ">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { taskApi, projectApi, userApi } from '../../utils/api';
import type { Task, Project, User } from '../../types/index';

export default {
  name: 'TasksPage',
  data ()
  {
    return {
      tasks: [] as Task[],
      projects: [] as Project[],
      users: [] as User[],
      showTaskModal: false,
      isEditMode: false,
      taskForm: {
        id: null as number | null,
        name: '',
        description: '',
        project_id: null as number | null,
        assigned_to: null as number | null,
        status: 'pending',
        priority: 'medium',
        due_date: ''
      },
      selectedProjectIndex: 0,
      selectedUserIndex: 0,
      selectedStatusIndex: 0,
      selectedPriorityIndex: 0,
      statusOptions: [ '全部状态', '待处理', '进行中', '已完成', '已取消' ],
      priorityOptions: [ '全部优先级', '低', '中', '高', '紧急' ],
      taskStatusOptions: [
        { label: '待处理', value: 'pending' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'cancelled' }
      ],
      taskPriorityOptions: [
        { label: '低', value: 'low' },
        { label: '中', value: 'medium' },
        { label: '高', value: 'high' },
        { label: '紧急', value: 'urgent' }
      ],
      filterStatus: '',
      filterPriority: '',
      isLoading: false
    };
  },
  computed: {
    filteredTasks (): Task[]
    {
      return this.tasks.filter( task =>
      {
        const statusMatch = !this.filterStatus || task.status === this.filterStatus;
        const priorityMatch = !this.filterPriority || task.priority === this.filterPriority;
        return statusMatch && priorityMatch;
      } );
    }
  },
  mounted ()
  {
    this.loadData();
  },
  methods: {
    loadData ()
    {
      this.loadTasks();
      this.loadProjects();
      this.loadUsers();
    },

    loadTasks ()
    {
      taskApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.tasks = res.data;
        }
      } ).catch( err =>
      {
        console.error( '加载任务列表失败:', err );
        uni.showToast( {
          title: '加载失败',
          icon: 'none'
        } );
      } );
    },

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
      } );
    },

    loadUsers ()
    {
      userApi.getAll().then( res =>
      {
        if ( res.success && res.data )
        {
          this.users = res.data;
        }
      } ).catch( err =>
      {
        console.error( '加载用户列表失败:', err );
      } );
    },

    onStatusChange ( e: any )
    {
      this.selectedStatusIndex = e.detail.value;
      const statusMap: Record<number, string> = {
        0: '',
        1: 'pending',
        2: 'in_progress',
        3: 'completed',
        4: 'cancelled'
      };
      this.filterStatus = statusMap[ this.selectedStatusIndex ];
    },

    onPriorityChange ( e: any )
    {
      this.selectedPriorityIndex = e.detail.value;
      const priorityMap: Record<number, string> = {
        0: '',
        1: 'low',
        2: 'medium',
        3: 'high',
        4: 'urgent'
      };
      this.filterPriority = priorityMap[ this.selectedPriorityIndex ];
    },

    showCreateTaskModal ()
    {
      this.isEditMode = false;
      this.taskForm = {
        id: null,
        name: '',
        description: '',
        project_id: null,
        assigned_to: null,
        status: 'pending',
        priority: 'medium',
        due_date: ''
      };
      this.selectedProjectIndex = 0;
      this.selectedUserIndex = 0;
      this.showTaskModal = true;
    },

    editTask ( task: Task )
    {
      this.isEditMode = true;
      this.taskForm = {
        id: task.id || null,
        name: task.name,
        description: task.description || '',
        project_id: task.project_id,
        assigned_to: task.assigned_to,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || ''
      };

      this.selectedProjectIndex = this.projects.findIndex( p => p.id === task.project_id );
      this.selectedUserIndex = this.users.findIndex( u => u.id === task.assigned_to );

      if ( this.selectedProjectIndex === -1 ) this.selectedProjectIndex = 0;
      if ( this.selectedUserIndex === -1 ) this.selectedUserIndex = 0;

      this.showTaskModal = true;
    },

    deleteTask ( task: Task )
    {
      uni.showModal( {
        title: '确认删除',
        content: `确定要删除任务"${ task.name }"吗？`,
        success: ( res ) =>
        {
          if ( res.confirm && task.id )
          {
            taskApi.delete( task.id ).then( response =>
            {
              if ( response.success )
              {
                uni.showToast( {
                  title: '删除成功',
                  icon: 'success'
                } );
                this.loadTasks();
              } else
              {
                uni.showToast( {
                  title: response.message || '删除失败',
                  icon: 'none'
                } );
              }
            } ).catch( err =>
            {
              console.error( '删除任务失败:', err );
              uni.showToast( {
                title: '删除失败',
                icon: 'none'
              } );
            } );
          }
        }
      } );
    },

    viewTaskDetail ( task: Task )
    {
      // 可扩展：跳转到任务详情页
      console.log( '查看任务详情:', task );
    },

    onProjectChange ( e: any )
    {
      this.selectedProjectIndex = e.detail.value;
      this.taskForm.project_id = this.projects[ this.selectedProjectIndex ]?.id || null;
    },

    onUserChange ( e: any )
    {
      this.selectedUserIndex = e.detail.value;
      this.taskForm.assigned_to = this.users[ this.selectedUserIndex ]?.id || null;
    },

    selectStatus ( status: string )
    {
      this.taskForm.status = status;
    },

    selectPriority ( priority: string )
    {
      this.taskForm.priority = priority;
    },

    onDueDateChange ( e: any )
    {
      this.taskForm.due_date = e.detail.value;
    },

    handleModalOverlayClick ()
    {
      this.closeTaskModal();
    },

    closeTaskModal ()
    {
      this.showTaskModal = false;
    },

    submitTaskForm ()
    {
      if ( !this.taskForm.name.trim() )
      {
        uni.showToast( {
          title: '请输入任务名称',
          icon: 'none'
        } );
        return;
      }

      if ( !this.taskForm.project_id )
      {
        uni.showToast( {
          title: '请选择所属项目',
          icon: 'none'
        } );
        return;
      }

      if ( !this.taskForm.assigned_to )
      {
        uni.showToast( {
          title: '请选择分配人员',
          icon: 'none'
        } );
        return;
      }

      this.isLoading = true;

      const submitData = {
        name: this.taskForm.name.trim(),
        description: this.taskForm.description.trim(),
        project_id: this.taskForm.project_id,
        assigned_to: this.taskForm.assigned_to,
        status: this.taskForm.status,
        priority: this.taskForm.priority,
        due_date: this.taskForm.due_date || undefined
      };

      const apiCall = this.isEditMode && this.taskForm.id
        ? taskApi.update( this.taskForm.id, submitData )
        : taskApi.create( submitData );

      apiCall.then( res =>
      {
        this.isLoading = false;
        if ( res.success )
        {
          uni.showToast( {
            title: this.isEditMode ? '更新成功' : '创建成功',
            icon: 'success'
          } );
          this.closeTaskModal();
          this.loadTasks();
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
        console.error( '提交任务失败:', err );
        uni.showToast( {
          title: '操作失败',
          icon: 'none'
        } );
      } );
    },

    getStatusLabel ( status: string ): string
    {
      const statusMap: Record<string, string> = {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消'
      };
      return statusMap[ status ] || status;
    },

    getStatusClass ( status: string ): string
    {
      return `status-${ status }`;
    },

    getPriorityLabel ( priority: string ): string
    {
      const priorityMap: Record<string, string> = {
        low: '低',
        medium: '中',
        high: '高',
        urgent: '紧急'
      };
      return priorityMap[ priority ] || priority;
    },

    getPriorityClass ( priority: string ): string
    {
      return `priority-${ priority }`;
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

.tasks-page {
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
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
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

.tasks-list {
  max-height: calc(100vh - 320rpx);
}

.task-card {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.task-name {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.project-name {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.task-priority {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
  font-weight: 300;
}

.priority-low {
  background-color: #E0E0E0;
  color: #828282;
}

.priority-medium {
  background-color: #BBE5B3;
  color: #27AE60;
}

.priority-high {
  background-color: #FFE0B2;
  color: #F2994A;
}

.priority-urgent {
  background-color: #FFCDD2;
  color: #EB5757;
}

.task-body {
  margin-bottom: 16rpx;
}

.task-description {
  font-size: 28rpx;
  font-weight: 300;
  color: #828282;
  line-height: 1.5;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #F2F2F2;
}

.task-meta {
  display: flex;
  gap: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  font-weight: 300;
  color: #828282;
}

.task-status {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
  font-weight: 300;
}

.status-pending {
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

.status-cancelled {
  background-color: #FFEBEE;
  color: #F44336;
}

.task-actions {
  display: flex;
  gap: 8rpx;
  margin-top: 16rpx;
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

.task-modal-overlay {
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

.task-modal-container {
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

.status-selector,
.priority-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.status-option,
.priority-option {
  padding: 24rpx;
  text-align: center;
  background-color: #F2F2F2;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.3s;
}

.status-option.active,
.priority-option.active {
  background-color: #6FCF97;
}

.status-option.active .status-text,
.priority-option.active .priority-text {
  color: #FFFFFF;
}

.status-text,
.priority-text {
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