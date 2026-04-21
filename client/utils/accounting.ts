// 默认分类定义
export const DEFAULT_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: 'restaurant-outline', color: '#FF6B9D', type: 'expense' as const },
  { id: 'transport', name: '交通', icon: 'car-outline', color: '#00D2FF', type: 'expense' as const },
  { id: 'shopping', name: '购物', icon: 'cart-outline', color: '#6C63FF', type: 'expense' as const },
  { id: 'entertainment', name: '娱乐', icon: 'game-controller-outline', color: '#FFB84D', type: 'expense' as const },
  { id: 'housing', name: '居住', icon: 'home-outline', color: '#5ED6A0', type: 'expense' as const },
  { id: 'medical', name: '医疗', icon: 'medkit-outline', color: '#FF6B6B', type: 'expense' as const },
  { id: 'income', name: '收入', icon: 'wallet-outline', color: '#4ECDC4', type: 'income' as const },
  { id: 'other', name: '其他', icon: 'ellipsis-horizontal-outline', color: '#A0A0A0', type: 'expense' as const },
];

// 默认账户定义
export const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: '现金', icon: 'cash-outline', color: '#5ED6A0' },
  { id: 'wechat', name: '微信', icon: 'chatbubble-outline', color: '#07C160' },
  { id: 'alipay', name: '支付宝', icon: 'card-outline', color: '#1677FF' },
  { id: 'bank', name: '银行卡', icon: 'business-outline', color: '#6C63FF' },
];

// 账单记录类型
export interface Record {
  id: string;
  amount: number;
  category: string;
  note: string;
  type: 'expense' | 'income';
  date: string;
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
      return { start: startOfWeek, end: today };
    }
    case 'month':
      return { 
        start: new Date(now.getFullYear(), now.getMonth(), 1), 
        end: today 
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
export const filterRecordsByPeriod = (records: Record[], period: PeriodType, customRange?: { start: Date; end: Date }) => {
  const { start, end } = getPeriodDateRange(period, customRange);
  
  if (!start || !end) return records;
  
  return records.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate >= start && recordDate <= end;
  });
};

// 计算周期统计数据
export const calculatePeriodStats = (records: Record[]) => {
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
export const calculateCategoryStats = (records: Record[]) => {
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
export const calculateMonthlyTrend = (records: Record[], months: number = 6) => {
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
