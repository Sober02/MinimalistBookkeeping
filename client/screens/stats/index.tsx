import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import {
  PeriodType,
  AccountRecord,
  filterRecordsByPeriod,
  calculatePeriodStats,
  calculateCategoryStats,
  calculateMonthlyTrend,
  formatDate,
  formatAmount,
  STORAGE_KEYS,
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  Category,
  Account,
} from '@/utils/accounting';

const { width } = Dimensions.get('window');

// 共享的输入框样式修复
const inputBaseStyle = {
  height: 48,
  paddingVertical: 0 as const,
  paddingTop: 0,
  paddingBottom: 0,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
};

// 毛玻璃卡片组件
const GlassCard = ({ children, style, intensity = 20 }: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) => (
  <View style={[styles.glassCard, style]}>
    <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
    <View style={styles.glassCardContent}>{children}</View>
  </View>
);

const PERIOD_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: '全部', value: 'all' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
];

export default function StatsPage() {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES as Category[]);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [customDateModalVisible, setCustomDateModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEndDate, setCustomEndDate] = useState(formatDate(new Date()));
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS as Account[]);

  // 使用 useFocusEffect 每次获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
          if (stored) {
            setRecords(JSON.parse(stored));
          }
          const catStored = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
          if (catStored) {
            setCategories(JSON.parse(catStored));
          }
          const accStored = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
          if (accStored) {
            setAccounts(JSON.parse(accStored));
          }
        } catch (error) {
          console.error('加载数据失败:', error);
        }
      };
      loadData();
    }, [])
  );

  // 过滤记录
  const getFilteredRecords = () => {
    let filtered = filterRecordsByPeriod(records, period, customRange);
    if (selectedAccount !== 'all') {
      filtered = filtered.filter((r: AccountRecord) => r.account === selectedAccount);
    }
    return filtered;
  };

  // 统计数据
  const filteredRecords = getFilteredRecords();
  const stats = calculatePeriodStats(filteredRecords);
  const categoryStats = calculateCategoryStats(filteredRecords);
  const monthlyTrend = calculateMonthlyTrend(records, 6);

  // 获取分类颜色
  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#A0A0A0';
  };

  // 获取分类名称
  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || '其他';
  };

  // 账户列表（含全部）
  const allAccounts = [
    { id: 'all', name: '全部', icon: 'apps-outline', color: '#6C63FF' },
    ...accounts,
  ];

  // 账户余额计算
  const getAccountBalance = (accountId: string) => {
    if (accountId === 'all') {
      const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
      const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
      return income - expense;
    }
    const income = records.filter(r => r.type === 'income' && r.account === accountId).reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter(r => r.type === 'expense' && r.account === accountId).reduce((sum, r) => sum + r.amount, 0);
    return income - expense;
  };

  // 总资产
  const totalAssets = getAccountBalance('all');

  // 饼图数据
  const pieData = categoryStats.slice(0, 6).map((stat) => ({
    value: stat.amount,
    color: getCategoryColor(stat.category),
    text: `${stat.percentage.toFixed(0)}%`,
    label: getCategoryName(stat.category),
  }));

  // 折线图数据 - 根据当前周期联动
  const getLineChartData = () => {
    if (period === 'all' || period === 'custom') {
      // 月度趋势
      const incomeData = monthlyTrend.map(item => ({
        value: item.income,
        dataPointText: '',
      }));
      const expenseData = monthlyTrend.map(item => ({
        value: item.expense,
        dataPointText: '',
      }));
      return { incomeData, expenseData, xLabels: monthlyTrend.map(m => m.month.slice(5)) };
    } else if (period === 'month' || period === 'lastMonth') {
      // 按日统计
      let targetYear: number, targetMonth: number;
      const now = new Date();
      if (period === 'month') {
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
      } else {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        targetYear = lastMonthDate.getFullYear();
        targetMonth = lastMonthDate.getMonth() + 1;
      }
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const periodRecords = filterRecordsByPeriod(records, period, customRange);
      const incomeData: { value: number; dataPointText: string }[] = [];
      const expenseData: { value: number; dataPointText: string }[] = [];
      const xLabels: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayRecords = periodRecords.filter(r => {
          const parts = r.date.split('-');
          return parseInt(parts[0]) === targetYear && parseInt(parts[1]) === targetMonth && parseInt(parts[2]) === d;
        });
        const income = dayRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
        const expense = dayRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
        incomeData.push({ value: income, dataPointText: '' });
        expenseData.push({ value: expense, dataPointText: '' });
        xLabels.push(`${d}`);
      }
      return { incomeData, expenseData, xLabels };
    } else if (period === 'week') {
      // 按天统计本周
      const periodRecords = filterRecordsByPeriod(records, period, customRange);
      const now = new Date();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const incomeData: { value: number; dataPointText: string }[] = [];
      const expenseData: { value: number; dataPointText: string }[] = [];
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dayStr = formatDate(day);
        const dayRecords = periodRecords.filter(r => r.date === dayStr);
        const income = dayRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
        const expense = dayRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
        incomeData.push({ value: income, dataPointText: '' });
        expenseData.push({ value: expense, dataPointText: '' });
      }
      return { incomeData, expenseData, xLabels: dayNames };
    }
    return { incomeData: [], expenseData: [], xLabels: [] };
  };

  const lineChart = getLineChartData();

  // 自定义日期确定
  const handleCustomDateConfirm = () => {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('提示', '请输入有效的日期格式 (YYYY-MM-DD)');
      return;
    }
    if (start > end) {
      Alert.alert('提示', '开始日期不能晚于结束日期');
      return;
    }
    setCustomRange({ start, end });
    setPeriod('custom');
    setCustomDateModalVisible(false);
  };

  // 计算折线图最大值
  const getMaxValue = () => {
    const allValues = [...lineChart.incomeData, ...lineChart.expenseData].map(d => d.value);
    const maxVal = Math.max(...allValues, 0);
    return maxVal > 0 ? Math.ceil(maxVal * 1.2 / 10) * 10 : 100;
  };

  return (
    <Screen backgroundColor="#0F0C29" statusBarStyle="light" safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      {/* 背景装饰 */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <Text style={styles.title}>周期统计</Text>

        {/* 周期切换 */}
        <View style={styles.periodScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodContainer}>
            {PERIOD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.periodButton, period === option.value && styles.periodButtonActive]}
                onPress={() => setPeriod(option.value)}
              >
                <Text style={[styles.periodButtonText, period === option.value && styles.periodButtonTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.periodButton, period === 'custom' && styles.periodButtonActive]}
              onPress={() => setCustomDateModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={period === 'custom' ? '#FFF' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.periodButtonText, period === 'custom' && styles.periodButtonTextActive]}>
                自定义
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 当前周期提示 */}
        {period === 'custom' && customRange && (
          <View style={styles.periodHint}>
            <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.periodHintText}>
              {customStartDate} 至 {customEndDate}
            </Text>
          </View>
        )}

        {/* 收支概览 */}
        <GlassCard style={styles.card} intensity={15}>
          <Text style={styles.cardTitle}>周期收支概览</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(78,205,196,0.2)' }]}>
                <Ionicons name="arrow-down" size={18} color="#4ECDC4" />
              </View>
              <Text style={styles.overviewLabel}>收入</Text>
              <Text style={[styles.overviewValue, { color: '#4ECDC4' }]}>¥{formatAmount(stats.income)}</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(255,107,157,0.2)' }]}>
                <Ionicons name="arrow-up" size={18} color="#FF6B9D" />
              </View>
              <Text style={styles.overviewLabel}>支出</Text>
              <Text style={[styles.overviewValue, { color: '#FF6B9D' }]}>¥{formatAmount(stats.expense)}</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(108,99,255,0.2)' }]}>
                <Ionicons name="wallet" size={18} color="#6C63FF" />
              </View>
              <Text style={styles.overviewLabel}>结余</Text>
              <Text style={[styles.overviewValue, { color: stats.balance >= 0 ? '#4ECDC4' : '#FF6B9D' }]}>
                ¥{formatAmount(stats.balance)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* 账户总览 */}
        <GlassCard style={styles.card} intensity={15}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>账户总览</Text>
            <Text style={[styles.totalAssets, { color: totalAssets >= 0 ? '#4ECDC4' : '#FF6B9D' }]}>
              总资产: ¥{formatAmount(totalAssets)}
            </Text>
          </View>
          <View style={styles.accountListWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountList}>
              {allAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountItem, selectedAccount === account.id && { borderColor: account.color, backgroundColor: `${account.color}20` }]}
                  onPress={() => setSelectedAccount(account.id)}
                >
                  <Ionicons name={account.icon as any} size={20} color={selectedAccount === account.id ? account.color : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.accountName, selectedAccount === account.id && { color: account.color }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.accountBalance, { color: selectedAccount === account.id ? account.color : 'rgba(255,255,255,0.6)' }]}>
                    ¥{formatAmount(getAccountBalance(account.id))}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </GlassCard>

        {/* 分类支出占比 - 使用 PieChart */}
        <GlassCard style={styles.card} intensity={15}>
          <Text style={styles.cardTitle}>分类支出占比</Text>
          {pieData.length > 0 ? (
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor="rgba(15,12,41,0.8)"
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterValue}>¥{formatAmount(stats.expense)}</Text>
                    <Text style={styles.pieCenterLabel}>总支出</Text>
                  </View>
                )}
                textColor="white"
                textSize={10}
                showText
                showValuesAsLabels={false}
                strokeWidth={0}
                focusOnPress={false}
              />
              <View style={styles.legendContainer}>
                {pieData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendValue}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>暂无支出数据</Text>
            </View>
          )}
        </GlassCard>

        {/* 收支趋势 - 纯折线图，根据周期联动 */}
        <GlassCard style={styles.card} intensity={15}>
          <Text style={styles.cardTitle}>
            {period === 'all' || period === 'custom' ? '月度收支趋势' :
             period === 'week' ? '本周收支趋势' : '每日收支趋势'}
          </Text>
          {lineChart.incomeData.length > 0 ? (
            <View style={styles.chartContainer}>
              <LineChart
                data={lineChart.incomeData}
                data2={lineChart.expenseData}
                width={width - 100}
                height={180}
                spacing={lineChart.xLabels.length > 0 ? Math.max(12, (width - 120) / (lineChart.xLabels.length + 1)) : 20}
                color1="#4ECDC4"
                color2="#FF6B9D"
                initialSpacing={10}
                endSpacing={10}
                noOfSections={4}
                maxValue={getMaxValue()}
                yAxisColor="rgba(255,255,255,0.15)"
                xAxisColor="rgba(255,255,255,0.15)"
                yAxisTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                hideRules
                curved
                showDataPointOnFocus
                dataPointsColor1="#4ECDC4"
                dataPointsColor2="#FF6B9D"
                dataPointsRadius={3}
                thickness={2}
                startFillColor1="transparent"
                endFillColor1="transparent"
                startFillColor2="transparent"
                endFillColor2="transparent"
                adjustToWidth
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: '#4ECDC4' }]} />
                  <Text style={styles.legendLabel}>收入</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: '#FF6B9D' }]} />
                  <Text style={styles.legendLabel}>支出</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="trending-up-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>暂无趋势数据</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>

      {/* 自定义日期选择弹窗 */}
      <Modal visible={customDateModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCustomDateModalVisible(false)}>
          <View style={styles.dateModalContainer}>
            <View style={styles.dateModalBg} />
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.dateModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>自定义日期范围</Text>
                <TouchableOpacity onPress={() => setCustomDateModalVisible(false)}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.dateHint}>请输入日期（格式：YYYY-MM-DD）</Text>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>开始日期</Text>
                <TextInput
                  style={[styles.dateInput, inputBaseStyle]}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  maxLength={10}
                />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>结束日期</Text>
                <TextInput
                  style={[styles.dateInput, inputBaseStyle]}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  maxLength={10}
                />
              </View>
              <TouchableOpacity style={styles.confirmButton} onPress={handleCustomDateConfirm}>
                <Text style={styles.confirmButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bgOrb1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#6C63FF', opacity: 0.12 },
  bgOrb2: { position: 'absolute', bottom: 100, right: -150, width: 250, height: 250, borderRadius: 125, backgroundColor: '#00D2FF', opacity: 0.08 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  glassCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  glassCardContent: { padding: 20 },
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalAssets: { fontSize: 13, fontWeight: '700' },
  periodScrollWrapper: { height: 50, marginBottom: 16 },
  periodContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  periodButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  periodButtonActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  periodButtonTextActive: { color: '#FFFFFF' },
  periodHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 },
  periodHintText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  overviewItem: { alignItems: 'center' },
  overviewIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  overviewLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  overviewValue: { fontSize: 15, fontWeight: '700' },
  accountListWrapper: { height: 90 },
  accountList: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  accountItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', minWidth: 75 },
  accountName: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  accountBalance: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  pieContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pieCenter: { alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  pieCenterLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  legendContainer: { flex: 1, marginLeft: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLine: { width: 16, height: 3, borderRadius: 2, marginRight: 8 },
  legendLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  chartContainer: { alignItems: 'center' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  emptyChart: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  dateModalContainer: { width: width - 60, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  dateModalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,15,50,0.95)' },
  dateModalContent: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  dateHint: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  dateInputGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  dateLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', width: 70 },
  dateInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF' },
  confirmButton: { backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
