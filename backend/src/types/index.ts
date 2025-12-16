export interface Transaction {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  date: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
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
  total_budget: number;
  category_id?: number;
  category_budget?: number;
  used_amount?: number;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  remaining?: number;
  percentage?: number;
  is_exceeded?: boolean;
  usage_percentage?: number;
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

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

export interface BudgetSummary {
  total_budget: number;
  total_expense: number;
  total_remaining: number;
}

export interface StatisticsSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface TransactionQueryParams {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
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

export interface DatabaseCallback<T = any> {
  (err: Error | null, result?: T): void;
}

export interface DatabaseRunResult {
  lastID?: number;
  changes?: number;
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

export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense';