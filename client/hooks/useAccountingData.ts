import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccountRecord,
  Category,
  Account,
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  PeriodType,
  filterRecordsByPeriod,
  calculatePeriodStats,
  calculateCategoryStats,
  calculateMonthlyTrend,
} from '@/utils/accounting';

const RECORDS_KEY = 'accounting_records';
const CATEGORIES_KEY = 'accounting_categories';
const ACCOUNTS_KEY = 'accounting_accounts';

export interface PeriodStats {
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryStat {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
}

export const useAccountingData = () => {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 加载所有数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const [recordsData, categoriesData, accountsData] = await Promise.all([
          AsyncStorage.getItem(RECORDS_KEY),
          AsyncStorage.getItem(CATEGORIES_KEY),
          AsyncStorage.getItem(ACCOUNTS_KEY),
        ]);

        if (recordsData) {
          setRecords(JSON.parse(recordsData));
        }
        if (categoriesData) {
          setCategories(JSON.parse(categoriesData));
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
        if (accountsData) {
          setAccounts(JSON.parse(accountsData));
        } else {
          setAccounts(DEFAULT_ACCOUNTS);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };
    loadData();
  }, []);

  // 保存记录
  const saveRecords = useCallback(async (newRecords: AccountRecord[]) => {
    try {
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error('保存记录失败:', error);
    }
  }, []);

  // 添加记录
  const addRecord = useCallback(async (record: Omit<AccountRecord, 'id' | 'timestamp' | 'year' | 'month'>) => {
    const now = new Date();
    const newRecord: AccountRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: now.getTime(),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
    const newRecords = [newRecord, ...records];
    await saveRecords(newRecords);
    return newRecord;
  }, [records, saveRecords]);

  // 更新记录
  const updateRecord = useCallback(async (id: string, updates: Partial<AccountRecord>) => {
    const newRecords = records.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    await saveRecords(newRecords);
  }, [records, saveRecords]);

  // 删除记录
  const deleteRecord = useCallback(async (id: string) => {
    const newRecords = records.filter(r => r.id !== id);
    await saveRecords(newRecords);
  }, [records, saveRecords]);

  // 保存分类
  const saveCategories = useCallback(async (newCategories: Category[]) => {
    try {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
      setCategories(newCategories);
    } catch (error) {
      console.error('保存分类失败:', error);
    }
  }, []);

  // 添加分类
  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const newCategory = { ...category, id: Date.now().toString(), isCustom: true };
    const newCategories = [...categories, newCategory];
    await saveCategories(newCategories);
  }, [categories, saveCategories]);

  // 删除分类
  const deleteCategory = useCallback(async (id: string) => {
    const newCategories = categories.filter(c => c.id !== id && !DEFAULT_CATEGORIES.find(d => d.id === id));
    await saveCategories(newCategories);
  }, [categories, saveCategories]);

  // 保存账户
  const saveAccounts = useCallback(async (newAccounts: Account[]) => {
    try {
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
      setAccounts(newAccounts);
    } catch (error) {
      console.error('保存账户失败:', error);
    }
  }, []);

  // 添加账户
  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: Date.now().toString(), isCustom: true };
    const newAccounts = [...accounts, newAccount];
    await saveAccounts(newAccounts);
  }, [accounts, saveAccounts]);

  // 删除账户
  const deleteAccount = useCallback(async (id: string) => {
    const newAccounts = accounts.filter(a => a.id !== id && !DEFAULT_ACCOUNTS.find(d => d.id === id));
    await saveAccounts(newAccounts);
  }, [accounts, saveAccounts]);

  // 获取分类信息
  const getCategoryInfo = useCallback((categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  }, [categories]);

  // 获取账户信息
  const getAccountInfo = useCallback((accountId: string) => {
    return accounts.find(a => a.id === accountId);
  }, [accounts]);

  // 获取过滤后的记录
  const getFilteredRecords = useCallback(() => {
    let filtered = filterRecordsByPeriod(records, period, customDateRange);
    
    if (selectedAccount !== 'all') {
      filtered = filtered.filter((r: AccountRecord) => r.account === selectedAccount);
    }
    
    if (selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategoryFilter);
    }
    
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((r: AccountRecord) =>
        r.note.toLowerCase().includes(keyword) ||
        getCategoryInfo(r.category)?.name.toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  }, [records, period, customDateRange, selectedAccount, selectedCategoryFilter, searchKeyword, categories, getCategoryInfo]);

  // 计算当前周期统计
  const periodStats = calculatePeriodStats(getFilteredRecords());
  
  // 计算分类统计
  const categoryStats = calculateCategoryStats(getFilteredRecords());
  
  // 计算月度趋势
  const monthlyTrend = calculateMonthlyTrend(records);
  
  // 计算所有账户总余额
  const totalBalance = records.reduce((sum, r) => {
    if (r.type === 'income') return sum + r.amount;
    return sum - r.amount;
  }, 0);

  return {
    // 数据
    records,
    categories,
    accounts,
    // 筛选状态
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    selectedAccount,
    setSelectedAccount,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    searchKeyword,
    setSearchKeyword,
    // 过滤后的记录
    filteredRecords: getFilteredRecords(),
    // 统计数据
    periodStats,
    categoryStats,
    monthlyTrend,
    totalBalance,
    // 操作方法
    addRecord,
    updateRecord,
    deleteRecord,
    addCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
    getCategoryInfo,
    getAccountInfo,
  };
};
