export interface Transaction {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  category_id?: number;
  date: string;
  note?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense';
  is_custom?: number;
  icon?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id?: number;
  month: string;
  total_budget?: number;
  category_id?: number;
  categoryId?: number;
  category_budget?: number;
  used_amount?: number;
  remaining?: number;
  percentage?: number;
  is_exceeded?: boolean;
  category_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryStatistics {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  total_amount: number;
  transaction_count: number;
}

export interface StatisticsSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface BudgetSummary {
  total_budget: number;
  total_expense: number;
  total_remaining: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

export interface TransactionCreateData {
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  date: string;
  note?: string;
}

export interface TransactionUpdateData {
  amount?: number;
  type?: 'income' | 'expense';
  categoryId?: number;
  date?: string;
  note?: string;
}

export interface CategoryCreateData {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface CategoryUpdateData {
  name?: string;
  icon?: string;
  color?: string;
}

export interface BudgetCreateData {
  month: string;
  totalBudget?: number;
  categoryBudgets?: Array<{
    categoryId: number;
    budget: number;
  }>;
}

export interface BudgetUpdateData {
  totalBudget?: number;
  categoryBudget?: number;
}

export interface BudgetAlert extends Budget {
  usage_percentage: number;
}

export interface StatisticsData {
  categories: CategoryStatistics[];
  income: CategoryStatistics[];
  expense: CategoryStatistics[];
  summary: StatisticsSummary;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

export interface MonthRange {
  startDate: string;
  endDate: string;
}

export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense';

// 用户相关类型定义
export interface User {
  id?: number;
  username: string;
  password?: string;
  role: 'resource_coordinator' | 'tech_manager' | 'consultant' | 'user';
  created_at?: string;
  updated_at?: string;
}

export interface UserCreateData {
  username: string;
  password: string;
  role?: 'resource_coordinator' | 'tech_manager' | 'consultant' | 'user';
}

export interface UserUpdateData {
  username?: string;
  password?: string;
  role?: 'resource_coordinator' | 'tech_manager' | 'consultant' | 'user';
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  username: string;
  role: string;
  token: string;
}

// 项目相关类型定义
export interface Project {
  id?: number;
  name: string;
  description?: string;
  created_by: number;
  creator_name?: string;
  start_date?: string;
  end_date?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'suspended' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface ProjectCreateData {
  name: string;
  description?: string;
  created_by: number;
  start_date?: string;
  end_date?: string;
  status?: 'planning' | 'in_progress' | 'completed' | 'suspended' | 'cancelled';
}

export interface ProjectUpdateData {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'planning' | 'in_progress' | 'completed' | 'suspended' | 'cancelled';
}

// 任务相关类型定义
export interface Task {
  id?: number;
  name: string;
  description?: string;
  project_id: number;
  project_name?: string;
  assigned_to: number;
  assigned_user_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskCreateData {
  name: string;
  description?: string;
  project_id: number;
  assigned_to: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}

export interface TaskUpdateData {
  name?: string;
  description?: string;
  assigned_to?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}

export type UserRole = 'resource_coordinator' | 'tech_manager' | 'consultant' | 'user';
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'suspended' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';