// 默认分类定义
export const DEFAULT_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: 'restaurant-outline', color: '#FF6B9D', type: 'expense' as const },
  { id: 'transport', name: '交通', icon: 'car-outline', color: '#00D2FF', type: 'expense' as const },
  { id: 'shopping', name: '购物', icon: 'cart-outline', color: '#6C63FF', type: 'expense' as const },
  { id: 'entertainment', name: '娱乐', icon: 'game-controller-outline', color: '#FFB84D', type: 'expense' as const },
  { id: 'housing', name: '居住', icon: 'home-outline', color: '#5ED6A0', type: 'expense' as const },
  { id: 'medical', name: '医疗', icon: 'medkit-outline', color: '#FF6B6B', type: 'expense' as const },
  { id: 'salary', name: '工资', icon: 'wallet-outline', color: '#4ECDC4', type: 'income' as const },
  { id: 'bonus', name: '奖金', icon: 'gift-outline', color: '#9B59B6', type: 'income' as const },
  { id: 'other_expense', name: '其他支出', icon: 'ellipsis-horizontal-outline', color: '#A0A0A0', type: 'expense' as const },
  { id: 'other_income', name: '其他收入', icon: 'add-circle-outline', color: '#F5A623', type: 'income' as const },
];

// 默认账户定义
export const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: '现金', icon: 'cash-outline', color: '#5ED6A0' },
  { id: 'wechat', name: '微信', icon: 'chatbubble-outline', color: '#07C160' },
  { id: 'alipay', name: '支付宝', icon: 'card-outline', color: '#1677FF' },
  { id: 'bank', name: '银行卡', icon: 'business-outline', color: '#6C63FF' },
];

// 账单记录类型
export interface AccountRecord {
  id: string;
  amount: number;
  category: string;
  note: string;
  type: 'expense' | 'income';
  date: string;        // YYYY-MM-DD format
  timestamp: number;
  account: string;
  year: number;
  month: number;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  isCustom?: boolean;
}

// 账户类型
export interface Account {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

// 周期类型
export type PeriodType = 'all' | 'week' | 'month' | 'lastMonth' | 'custom';

// Storage keys
export const STORAGE_KEYS = {
  RECORDS: 'accounting_records',
  CATEGORIES: 'accounting_categories',
  ACCOUNTS: 'accounting_accounts',
};

// 格式化日期为 YYYY-MM-DD
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 格式化日期为显示用的中文格式
export const formatDateDisplay = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  }
  return dateStr;
};

// 获取周期的开始和结束日期
export const getPeriodDateRange = (period: PeriodType, customRange?: { start: Date; end: Date }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'all':
      return { start: null, end: null };
    case 'week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };
    }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case 'lastMonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lastMonth, end: endOfLastMonth };
    }
    case 'custom':
      return customRange || { start: today, end: today };
    default:
      return { start: null, end: null };
  }
};

// 过滤指定周期内的记录
export const filterRecordsByPeriod = (records: AccountRecord[], period: PeriodType, customRange?: { start: Date; end: Date }) => {
  const { start, end } = getPeriodDateRange(period, customRange);

  if (!start || !end) return records;

  return records.filter(r => {
    const recordDate = new Date(r.date);
    // Set time to start of day for accurate comparison
    recordDate.setHours(0, 0, 0, 0);
    const startNorm = new Date(start);
    startNorm.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(23, 59, 59, 999);
    return recordDate >= startNorm && recordDate <= endNorm;
  });
};

// 计算周期统计数据
export const calculatePeriodStats = (records: AccountRecord[]) => {
  const income = records
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  const expense = records
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
  };
};

// 计算分类支出占比
export const calculateCategoryStats = (records: AccountRecord[]) => {
  const expenseRecords = records.filter(r => r.type === 'expense');
  const totalExpense = expenseRecords.reduce((sum, r) => sum + r.amount, 0);

  const categoryMap = new Map<string, number>();
  expenseRecords.forEach(r => {
    const current = categoryMap.get(r.category) || 0;
    categoryMap.set(r.category, current + r.amount);
  });

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// 计算月度趋势
export const calculateMonthlyTrend = (records: AccountRecord[], months: number = 6) => {
  const now = new Date();
  const result: { month: string; income: number; expense: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;

    const monthRecords = records.filter(r =>
      r.year === targetMonth.getFullYear() && r.month === targetMonth.getMonth() + 1
    );

    const income = monthRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const expense = monthRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    result.push({
      month: monthStr,
      income,
      expense,
    });
  }

  return result;
};

// 格式化金额
export const formatAmount = (value: number) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
