const BASE_URL = 'https://hmwork.tutlab.tech:20261/api';

interface ApiResponse<T = any>
{
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

interface Transaction
{
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  date: string;
  note?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  category_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface Category
{
  id?: number;
  name: string;
  type: 'income' | 'expense';
  is_custom?: number;
  icon?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

interface Budget
{
  id?: number;
  month: string;
  totalBudget?: number;
  categoryId?: number;
  categoryBudget?: number;
  used_amount?: number;
  remaining?: number;
  percentage?: number;
  is_exceeded?: boolean;
  category_name?: string;
  total_budget?: number;
  category_id?: number;
  category_budget?: number;
  created_at?: string;
  updated_at?: string;
}

interface CategoryStatistics
{
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  total_amount: number;
  transaction_count: number;
}

interface StatisticsSummary
{
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface BudgetSummary
{
  total_budget: number;
  total_expense: number;
  total_remaining: number;
}

interface RequestOptions extends Partial<UniApp.RequestOptions>
{
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

const request = async <T = any> (
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> =>
{
  return new Promise( ( resolve, reject ) =>
  {
    uni.request( {
      url: `${ BASE_URL }${ url }`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      success: ( res: UniApp.RequestSuccessCallbackResult ) =>
      {
        if ( res.statusCode >= 200 && res.statusCode < 300 )
        {
          resolve( res.data as ApiResponse<T> );
        } else
        {
          reject( {
            success: false,
            message: ( res.data as any )?.message || '请求失败',
            error: res.errMsg,
          } );
        }
      },
      fail: ( err: UniApp.GeneralCallbackResult ) =>
      {
        reject( {
          success: false,
          message: '网络请求失败',
          error: err.errMsg,
        } );
      },
    } );
  } );
};

export const transactionApi = {
  getAll: (): Promise<ApiResponse<Transaction[]>> =>
    request<Transaction[]>( '/transactions' ),

  getById: ( id: number ): Promise<ApiResponse<Transaction>> =>
    request<Transaction>( `/transactions/${ id }` ),

  getByMonth: ( year: number, month: number ): Promise<ApiResponse<Transaction[]>> =>
    request<Transaction[]>( `/transactions?year=${ year }&month=${ month }` ),

  getByDateRange: ( startDate: string, endDate: string ): Promise<ApiResponse<Transaction[]>> =>
    request<Transaction[]>(
      `/transactions?startDate=${ startDate }&endDate=${ endDate }`
    ),

  create: ( data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> ): Promise<ApiResponse<Transaction>> =>
    request<Transaction>( '/transactions', {
      method: 'POST',
      data,
    } ),

  update: ( id: number, data: Partial<Transaction> ): Promise<ApiResponse<Transaction>> =>
    request<Transaction>( `/transactions/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/transactions/${ id }`, {
      method: 'DELETE',
    } ),

  getStatistics: (
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    categories: CategoryStatistics[];
    income: CategoryStatistics[];
    expense: CategoryStatistics[];
    summary: StatisticsSummary;
  }>> =>
    request<{
      categories: CategoryStatistics[];
      income: CategoryStatistics[];
      expense: CategoryStatistics[];
      summary: StatisticsSummary;
    }>( `/transactions/statistics?startDate=${ startDate }&endDate=${ endDate }` ),
};

export const categoryApi = {
  getAll: (): Promise<ApiResponse<Category[]>> =>
    request<Category[]>( '/categories' ),

  getById: ( id: number ): Promise<ApiResponse<Category>> =>
    request<Category>( `/categories/${ id }` ),

  getByType: ( type: 'income' | 'expense' ): Promise<ApiResponse<Category[]>> =>
    request<Category[]>( `/categories?type=${ type }` ),

  create: ( data: Omit<Category, 'id' | 'is_custom' | 'created_at' | 'updated_at'> ): Promise<ApiResponse<Category>> =>
    request<Category>( '/categories', {
      method: 'POST',
      data,
    } ),

  update: ( id: number, data: Partial<Category> ): Promise<ApiResponse<Category>> =>
    request<Category>( `/categories/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/categories/${ id }`, {
      method: 'DELETE',
    } ),
};

export const budgetApi = {
  getByMonth: ( month: string ): Promise<ApiResponse<{
    data: Budget[];
    summary: BudgetSummary;
  }>> =>
    request<{
      data: Budget[];
      summary: BudgetSummary;
    }>( `/budgets?month=${ month }` ),

  create: ( data: {
    month: string;
    totalBudget?: number;
    categoryBudgets?: Array<{ categoryId: number; budget: number }>;
  } ): Promise<ApiResponse<Budget>> =>
    request<Budget>( '/budgets', {
      method: 'POST',
      data,
    } ),

  update: (
    id: number,
    data: { totalBudget?: number; categoryBudget?: number }
  ): Promise<ApiResponse<Budget>> =>
    request<Budget>( `/budgets/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/budgets/${ id }`, {
      method: 'DELETE',
    } ),

  getAlerts: ( month: string ): Promise<ApiResponse<Budget[]>> =>
    request<Budget[]>( `/budgets/alerts?month=${ month }` ),
};

export const formatDate = ( date: Date ): string =>
{
  const year = date.getFullYear();
  const month = String( date.getMonth() + 1 ).padStart( 2, '0' );
  const day = String( date.getDate() ).padStart( 2, '0' );
  return `${ year }-${ month }-${ day }`;
};

export const getCurrentMonth = (): string =>
{
  const date = new Date();
  const year = date.getFullYear();
  const month = String( date.getMonth() + 1 ).padStart( 2, '0' );
  return `${ year }-${ month }`;
};

export const getMonthRange = (
  year: number,
  month: number
): { startDate: string; endDate: string } =>
{
  const startDate = `${ year }-${ String( month ).padStart( 2, '0' ) }-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${ nextYear }-${ String( nextMonth ).padStart( 2, '0' ) }-01`;
  return { startDate, endDate };
};

export type {
  ApiResponse,
  Transaction,
  Category,
  Budget,
  CategoryStatistics,
  StatisticsSummary,
  BudgetSummary,
  RequestOptions,
};

// ============ 用户认证相关接口 ============
interface User
{
  id?: number;
  username: string;
  password?: string;
  role: 'resource_coordinator' | 'tech_manager' | 'consultant' | 'user';
  created_at?: string;
  updated_at?: string;
}

interface LoginData
{
  username: string;
  password: string;
}

interface AuthResponse
{
  id: number;
  username: string;
  role: string;
  token: string;
}

export const authApi = {
  register: ( data: { username: string; password: string; role?: string } ): Promise<ApiResponse<AuthResponse>> =>
    request<AuthResponse>( '/auth/register', {
      method: 'POST',
      data,
    } ),

  login: ( data: LoginData ): Promise<ApiResponse<AuthResponse>> =>
    request<AuthResponse>( '/auth/login', {
      method: 'POST',
      data,
    } ),

  verify: (): Promise<ApiResponse<User>> =>
    request<User>( '/auth/verify', {
      method: 'GET',
      header: {
        'Authorization': `Bearer ${ uni.getStorageSync( 'token' ) }`,
      },
    } ),

  logout: (): Promise<ApiResponse<void>> =>
    request<void>( '/auth/logout', {
      method: 'POST',
    } ),
};

// ============ 用户管理相关接口 ============
export const userApi = {
  getAll: (): Promise<ApiResponse<User[]>> =>
    request<User[]>( '/users' ),

  getById: ( id: number ): Promise<ApiResponse<User>> =>
    request<User>( `/users/${ id }` ),

  create: ( data: { username: string; password: string; role?: string } ): Promise<ApiResponse<User>> =>
    request<User>( '/users', {
      method: 'POST',
      data,
    } ),

  update: ( id: number, data: Partial<User> ): Promise<ApiResponse<User>> =>
    request<User>( `/users/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/users/${ id }`, {
      method: 'DELETE',
    } ),

  getByRole: ( role: string ): Promise<ApiResponse<User[]>> =>
    request<User[]>( `/users?role=${ role }` ),
};

// ============ 项目管理相关接口 ============
interface Project
{
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

export const projectApi = {
  getAll: (): Promise<ApiResponse<Project[]>> =>
    request<Project[]>( '/projects' ),

  getById: ( id: number ): Promise<ApiResponse<Project>> =>
    request<Project>( `/projects/${ id }` ),

  create: ( data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'creator_name'> ): Promise<ApiResponse<Project>> =>
    request<Project>( '/projects', {
      method: 'POST',
      data,
    } ),

  update: ( id: number, data: Partial<Project> ): Promise<ApiResponse<Project>> =>
    request<Project>( `/projects/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/projects/${ id }`, {
      method: 'DELETE',
    } ),

  getByUser: ( userId: number ): Promise<ApiResponse<Project[]>> =>
    request<Project[]>( `/projects/user/${ userId }` ),

  getByStatus: ( status: string ): Promise<ApiResponse<Project[]>> =>
    request<Project[]>( `/projects/status/${ status }` ),
};

// ============ 任务管理相关接口 ============
interface Task
{
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

export const taskApi = {
  getAll: (): Promise<ApiResponse<Task[]>> =>
    request<Task[]>( '/tasks' ),

  getById: ( id: number ): Promise<ApiResponse<Task>> =>
    request<Task>( `/tasks/${ id }` ),

  create: ( data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project_name' | 'assigned_user_name'> ): Promise<ApiResponse<Task>> =>
    request<Task>( '/tasks', {
      method: 'POST',
      data,
    } ),

  update: ( id: number, data: Partial<Task> ): Promise<ApiResponse<Task>> =>
    request<Task>( `/tasks/${ id }`, {
      method: 'PUT',
      data,
    } ),

  delete: ( id: number ): Promise<ApiResponse<void>> =>
    request<void>( `/tasks/${ id }`, {
      method: 'DELETE',
    } ),

  getByProject: ( projectId: number ): Promise<ApiResponse<Task[]>> =>
    request<Task[]>( `/tasks?project_id=${ projectId }` ),

  getByUser: ( userId: number ): Promise<ApiResponse<Task[]>> =>
    request<Task[]>( `/tasks/user/${ userId }` ),

  getByStatus: ( status: string ): Promise<ApiResponse<Task[]>> =>
    request<Task[]>( `/tasks/status/${ status }` ),
};

export type {
  User,
  LoginData,
  AuthResponse,
  Project,
  Task,
};