import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import {
  PeriodType,
  AccountRecord,
  Account,
  Category,
  filterRecordsByPeriod,
  calculatePeriodStats,
  formatDate,
  formatAmount,
  STORAGE_KEYS,
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
} from '@/utils/accounting';

const { width } = Dimensions.get('window');

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

export default function HomePage() {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES as Category[]);
  const [accounts] = useState<Account[]>(DEFAULT_ACCOUNTS as Account[]);
  const [period, setPeriod] = useState<PeriodType>('month');

  // 输入状态
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [selectedAccount, setSelectedAccount] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense');

  // 使用 useFocusEffect 确保每次页面获得焦点时刷新数据
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
        } catch (error) {
          console.error('加载数据失败:', error);
        }
      };
      loadData();
    }, [])
  );

  // 保存数据
  const saveRecords = async (newRecords: AccountRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  };

  // 过滤当前周期的记录
  const filteredRecords = filterRecordsByPeriod(records, period);

  // 计算统计数据
  const stats = calculatePeriodStats(filteredRecords);

  // 金额输入处理
  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    if (cleaned.startsWith('-')) {
      cleaned = cleaned.slice(1);
    }
    setAmount(cleaned);
  };

  // 添加记录
  const handleAddRecord = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    const now = new Date();
    const newRecord: AccountRecord = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category: selectedCategory,
      note: note.trim(),
      type: recordType,
      date: formatDate(now),
      timestamp: now.getTime(),
      account: selectedAccount,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };

    await saveRecords([newRecord, ...records]);

    // 清空输入
    setAmount('');
    setNote('');
    Alert.alert('成功', '记账成功');
  };

  // 获取分类列表
  const categoryList = categories.filter(c =>
    recordType === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  // 获取分类信息
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // 渲染单条记录
  const renderRecord = ({ item }: { item: AccountRecord }) => {
    const category = getCategoryInfo(item.category);
    return (
      <View style={styles.recordItem}>
        <View style={[styles.recordIcon, { backgroundColor: `${category?.color || '#A0A0A0'}20` }]}>
          <Ionicons name={(category?.icon || 'ellipsis-horizontal-outline') as any} size={18} color={category?.color || '#A0A0A0'} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordName}>{category?.name || '其他'}</Text>
          <Text style={styles.recordDate}>{item.date}</Text>
        </View>
        <Text style={[styles.recordAmount, { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' }]}>
          {item.type === 'income' ? '+' : '-'}¥{formatAmount(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <Screen backgroundColor="#0F0C29" statusBarStyle="light" safeAreaEdges={['left', 'right', 'bottom']}>
      {/* 背景装饰 */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />
      <View style={styles.bgOrb3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 标题 */}
          <Text style={styles.title}>个人记账</Text>

          {/* 周期切换 */}
          <View style={styles.periodContainer}>
            {(['all', 'week', 'month', 'lastMonth'] as PeriodType[]).map((p) => {
              const labels: Record<string, string> = { all: '全部', week: '本周', month: '本月', lastMonth: '上月', custom: '自定义' };
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, period === p && styles.periodButtonActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                    {labels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 统计卡片 */}
          <GlassCard style={styles.statsCard} intensity={15}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>收入</Text>
                <Text style={[styles.statValue, { color: '#4ECDC4' }]}>¥{formatAmount(stats.income)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>支出</Text>
                <Text style={[styles.statValue, { color: '#FF6B9D' }]}>¥{formatAmount(stats.expense)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>结余</Text>
                <Text style={[styles.statValue, { color: stats.balance >= 0 ? '#4ECDC4' : '#FF6B9D' }]}>
                  ¥{formatAmount(stats.balance)}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 最近记录 */}
          <GlassCard style={styles.recentCard} intensity={15}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>最近记录</Text>
              <Text style={styles.recentCount}>{filteredRecords.length}笔</Text>
            </View>
            {filteredRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>暂无记录</Text>
              </View>
            ) : (
              <FlatList
                data={filteredRecords.slice(0, 5)}
                renderItem={renderRecord}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </GlassCard>

          {/* 记账输入 */}
          <GlassCard style={styles.inputCard} intensity={15}>
            <Text style={styles.sectionTitle}>记一笔</Text>

            {/* 类型切换 */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeButton, recordType === 'expense' && styles.typeButtonActive]}
                onPress={() => {
                  setRecordType('expense');
                  setSelectedCategory('food');
                }}
              >
                <Ionicons name="arrow-up-outline" size={16} color={recordType === 'expense' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.typeButtonText, recordType === 'expense' && styles.typeButtonTextActive]}>支出</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, recordType === 'income' && styles.typeButtonActiveIncome]}
                onPress={() => {
                  setRecordType('income');
                  const firstIncome = categories.find(c => c.type === 'income');
                  if (firstIncome) setSelectedCategory(firstIncome.id);
                }}
              >
                <Ionicons name="arrow-down-outline" size={16} color={recordType === 'income' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.typeButtonText, recordType === 'income' && styles.typeButtonTextActive]}>收入</Text>
              </TouchableOpacity>
            </View>

            {/* 金额输入 */}
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={handleAmountChange}
                maxLength={12}
              />
            </View>

            {/* 分类选择 */}
            <Text style={styles.labelText}>选择分类</Text>
            <View style={styles.categoriesScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {categoryList.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryItem, selectedCategory === category.id && { borderColor: category.color, backgroundColor: `${category.color}20` }]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons name={category.icon as any} size={22} color={selectedCategory === category.id ? category.color : 'rgba(255,255,255,0.5)'} />
                    <Text style={[styles.categoryText, selectedCategory === category.id && { color: category.color }]}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 账户选择 */}
            <Text style={styles.labelText}>选择账户</Text>
            <View style={styles.categoriesScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.categoryItem, selectedAccount === account.id && { borderColor: account.color, backgroundColor: `${account.color}20` }]}
                    onPress={() => setSelectedAccount(account.id)}
                  >
                    <Ionicons name={account.icon as any} size={22} color={selectedAccount === account.id ? account.color : 'rgba(255,255,255,0.5)'} />
                    <Text style={[styles.categoryText, selectedAccount === account.id && { color: account.color }]}>{account.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 备注 */}
            <TextInput
              style={styles.noteInput}
              placeholder="备注（可选）"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={note}
              onChangeText={setNote}
              maxLength={50}
            />

            {/* 提交按钮 */}
            <TouchableOpacity onPress={handleAddRecord} activeOpacity={0.8}>
              <LinearGradient
                colors={recordType === 'expense' ? ['#FF6B9D', '#FF8E53'] : ['#4ECDC4', '#44A08D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                <Ionicons name="add-circle" size={22} color="#FFF" />
                <Text style={styles.submitButtonText}>记一笔</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bgOrb1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#6C63FF', opacity: 0.15 },
  bgOrb2: { position: 'absolute', top: 300, left: -150, width: 250, height: 250, borderRadius: 125, backgroundColor: '#00D2FF', opacity: 0.1 },
  bgOrb3: { position: 'absolute', bottom: 200, right: -100, width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF6B9D', opacity: 0.1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  glassCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  glassCardContent: { padding: 20 },
  periodContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  periodButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  periodButtonActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  periodButtonTextActive: { color: '#FFFFFF' },
  statsCard: { marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.1)' },
  recentCard: { marginBottom: 16 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  recentTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  recentCount: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 10 },
  recordItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  recordIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recordInfo: { flex: 1, marginLeft: 12 },
  recordName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  recordDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  recordAmount: { fontSize: 15, fontWeight: '700' },
  inputCard: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  typeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  typeButtonActive: { backgroundColor: '#FF6B9D' },
  typeButtonActiveIncome: { backgroundColor: '#4ECDC4' },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  typeButtonTextActive: { color: '#FFFFFF' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 48 },
  currencySymbol: { fontSize: 28, fontWeight: '300', color: 'rgba(255,255,255,0.5)', marginRight: 4 },
  amountInput: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', minWidth: 120, textAlign: 'center', height: 48, padding: 0 },
  labelText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, marginTop: 8 },
  categoriesScroll: { height: 70 },
  categoriesContainer: { flexDirection: 'row', gap: 10, paddingRight: 10 },
  categoryItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', minWidth: 65 },
  categoryText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'center' },
  noteInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF', marginTop: 16, marginBottom: 20, height: 48, paddingVertical: 0 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  submitButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
