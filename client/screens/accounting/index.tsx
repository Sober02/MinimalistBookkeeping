import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';

const { width } = Dimensions.get('window');

// 分类定义
const CATEGORIES = [
  { id: 'food', name: '餐饮', icon: 'restaurant-outline', color: '#FF6B9D' },
  { id: 'transport', name: '交通', icon: 'car-outline', color: '#00D2FF' },
  { id: 'shopping', name: '购物', icon: 'cart-outline', color: '#6C63FF' },
  { id: 'entertainment', name: '娱乐', icon: 'game-controller-outline', color: '#FFB84D' },
  { id: 'housing', name: '居住', icon: 'home-outline', color: '#5ED6A0' },
  { id: 'medical', name: '医疗', icon: 'medkit-outline', color: '#FF6B6B' },
  { id: 'income', name: '收入', icon: 'wallet-outline', color: '#4ECDC4' },
  { id: 'other', name: '其他', icon: 'ellipsis-horizontal-outline', color: '#A0A0A0' },
];

// 类型定义
interface Record {
  id: string;
  amount: number;
  category: string;
  note: string;
  type: 'expense' | 'income';
  date: string;
  timestamp: number;
}

// 毛玻璃卡片组件
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

// 统计卡片组件
const StatCard = ({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: string;
  color: string;
  icon: string;
}) => (
  <GlassCard style={styles.statCard}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={styles.statLabel}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </GlassCard>
);

export default function AccountingPage() {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [note, setNote] = useState('');
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense');
  const [records, setRecords] = useState<Record[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = await AsyncStorage.getItem('accounting_records');
        if (stored) {
          const parsedRecords = JSON.parse(stored);
          setRecords(parsedRecords);
          // 计算统计数据
          const income = parsedRecords
            .filter((r: Record) => r.type === 'income')
            .reduce((sum: number, r: Record) => sum + r.amount, 0);
          const expense = parsedRecords
            .filter((r: Record) => r.type === 'expense')
            .reduce((sum: number, r: Record) => sum + r.amount, 0);
          setStats({
            income: income,
            expense: expense,
            balance: income - expense,
          });
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };
    fetchData();
  }, []);

  // 保存数据
  const saveData = async (newRecords: Record[]) => {
    try {
      await AsyncStorage.setItem('accounting_records', JSON.stringify(newRecords));
      setRecords(newRecords);
      // 计算统计数据
      const income = newRecords
        .filter((r) => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      const expense = newRecords
        .filter((r) => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      setStats({
        income: income,
        expense: expense,
        balance: income - expense,
      });
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  };

  // 添加记录
  const handleAddRecord = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    const newRecord: Record = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category: selectedCategory,
      note: note.trim(),
      type: recordType,
      date: new Date().toLocaleDateString('zh-CN'),
      timestamp: Date.now(),
    };

    const newRecords = [newRecord, ...records];
    await saveData(newRecords);

    // 清空输入
    setAmount('');
    setNote('');
  };

  // 删除记录
  const handleDeleteRecord = (id: string) => {
    Alert.alert('删除确认', '确定要删除这条记录吗?', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newRecords = records.filter((r) => r.id !== id);
          await saveData(newRecords);
        },
      },
    ]);
  };

  // 获取分类信息
  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[7];
  };

  // 渲染单条记录
  const renderRecord = ({ item }: { item: Record }) => {
    const category = getCategoryInfo(item.category);
    return (
      <TouchableOpacity onLongPress={() => handleDeleteRecord(item.id)}>
        <GlassCard style={styles.recordCard}>
          <View style={styles.recordLeft}>
            <View
              style={[
                styles.recordIconContainer,
                { backgroundColor: `${category.color}20` },
              ]}
            >
              <Ionicons name={category.icon as any} size={22} color={category.color} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordCategory}>{category.name}</Text>
              {item.note ? (
                <Text style={styles.recordNote} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
              <Text style={styles.recordDate}>{item.date}</Text>
            </View>
          </View>
          <Text
            style={[
              styles.recordAmount,
              { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}
            ¥{item.amount.toFixed(2)}
          </Text>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // 格式化金额
  const formatAmount = (value: number) => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
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

            {/* 统计卡片 */}
            <View style={styles.statsContainer}>
              <StatCard
                title="总收入"
                value={`¥${formatAmount(stats.income)}`}
                color="#4ECDC4"
                icon="arrow-down-circle"
              />
              <StatCard
                title="总支出"
                value={`¥${formatAmount(stats.expense)}`}
                color="#FF6B9D"
                icon="arrow-up-circle"
              />
            </View>
            <GlassCard style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>账户余额</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: stats.balance >= 0 ? '#4ECDC4' : '#FF6B9D' },
                ]}
              >
                ¥{formatAmount(stats.balance)}
              </Text>
            </GlassCard>

            {/* 输入区域 */}
            <GlassCard style={styles.inputCard}>
              <Text style={styles.sectionTitle}>记账</Text>

              {/* 类型切换 */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    recordType === 'expense' && styles.typeButtonActive,
                  ]}
                  onPress={() => setRecordType('expense')}
                >
                  <Ionicons
                    name="arrow-up-outline"
                    size={16}
                    color={recordType === 'expense' ? '#FFF' : 'rgba(255,255,255,0.5)'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      recordType === 'expense' && styles.typeButtonTextActive,
                    ]}
                  >
                    支出
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    recordType === 'income' && styles.typeButtonActiveIncome,
                  ]}
                  onPress={() => setRecordType('income')}
                >
                  <Ionicons
                    name="arrow-down-outline"
                    size={16}
                    color={recordType === 'income' ? '#FFF' : 'rgba(255,255,255,0.5)'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      recordType === 'income' && styles.typeButtonTextActive,
                    ]}
                  >
                    收入
                  </Text>
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
                  onChangeText={setAmount}
                />
              </View>

              {/* 分类选择 */}
              <Text style={styles.labelText}>选择分类</Text>
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        selectedCategory === category.id && {
                          borderColor: category.color,
                          backgroundColor: `${category.color}20`,
                        },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={24}
                        color={
                          selectedCategory === category.id
                            ? category.color
                            : 'rgba(255,255,255,0.6)'
                        }
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === category.id && { color: category.color },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 备注输入 */}
              <TextInput
                style={styles.noteInput}
                placeholder="添加备注（可选）"
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

            {/* 记录列表 */}
            <View style={styles.recordsSection}>
              <Text style={styles.sectionTitle}>收支明细</Text>
              {records.length === 0 ? (
                <GlassCard style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>暂无记录</Text>
                  <Text style={styles.emptySubtext}>开始记录你的第一笔收支吧</Text>
                </GlassCard>
              ) : (
                <FlatList
                  data={records.slice(0, 20)}
                  renderItem={renderRecord}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C29',
  },
  bgOrb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6C63FF',
    opacity: 0.15,
  },
  bgOrb2: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#00D2FF',
    opacity: 0.1,
  },
  bgOrb3: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF6B9D',
    opacity: 0.1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  inputCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#FF6B9D',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#4ECDC4',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 150,
    textAlign: 'center',
  },
  labelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingBottom: 12,
    gap: 10,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 70,
  },
  categoryText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  noteInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recordsSection: {
    marginTop: 8,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    marginLeft: 12,
    flex: 1,
  },
  recordCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  recordDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  recordAmount: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
  },
});
