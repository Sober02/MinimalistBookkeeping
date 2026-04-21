import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAccountingData } from '@/hooks/useAccountingData';
import { PeriodType, getPeriodDateRange } from '@/utils/accounting';

const { width } = Dimensions.get('window');

// 毛玻璃卡片组件
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

const PERIOD_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: '全部', value: 'all' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
];

export default function HomePage() {
  const {
    categories,
    accounts,
    period,
    setPeriod,
    periodStats,
    addRecord,
    getCategoryInfo,
    getAccountInfo,
  } = useAccountingData();

  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [selectedAccount, setSelectedAccount] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense');

  // 金额输入处理 - 自动保留两位小数
  const handleAmountChange = (text: string) => {
    // 移除非数字和小数点的字符
    let cleaned = text.replace(/[^0-9.]/g, '');
    // 确保只有一个小数点
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // 限制小数位数最多两位
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    // 禁止负数
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

    await addRecord({
      amount: parseFloat(amount),
      category: selectedCategory,
      note: note.trim(),
      type: recordType,
      date: new Date().toLocaleDateString('zh-CN'),
      account: selectedAccount,
    });

    // 清空输入
    setAmount('');
    setNote('');
    
    // 显示成功提示
    Alert.alert('成功', '记账成功', [{ text: '确定' }]);
  };

  // 格式化金额
  const formatAmount = (value: number) => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 获取分类列表
  const categoryList = categories.filter(c => 
    recordType === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  return (
    <Screen>
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
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.periodContainer}
            >
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.periodButton,
                    period === option.value && styles.periodButtonActive,
                  ]}
                  onPress={() => setPeriod(option.value)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      period === option.value && styles.periodButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 统计卡片 */}
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>收入</Text>
                <Text style={[styles.statValue, { color: '#4ECDC4' }]}>
                  ¥{formatAmount(periodStats.income)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>支出</Text>
                <Text style={[styles.statValue, { color: '#FF6B9D' }]}>
                  ¥{formatAmount(periodStats.expense)}
                </Text>
              </View>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>结余</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: periodStats.balance >= 0 ? '#4ECDC4' : '#FF6B9D' },
                ]}
              >
                ¥{formatAmount(periodStats.balance)}
              </Text>
            </View>
          </GlassCard>

          {/* 记账输入区域 */}
          <GlassCard style={styles.inputCard}>
            <Text style={styles.sectionTitle}>记一笔</Text>

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
                onChangeText={handleAmountChange}
                maxLength={12}
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
                {categoryList.map((category) => (
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

            {/* 账户选择 */}
            <Text style={styles.labelText}>选择账户</Text>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.categoryItem,
                      selectedAccount === account.id && {
                        borderColor: account.color,
                        backgroundColor: `${account.color}20`,
                      },
                    ]}
                    onPress={() => setSelectedAccount(account.id)}
                  >
                    <Ionicons
                      name={account.icon as any}
                      size={24}
                      color={
                        selectedAccount === account.id
                          ? account.color
                          : 'rgba(255,255,255,0.6)'
                      }
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        selectedAccount === account.id && { color: account.color },
                      ]}
                    >
                      {account.name}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C29',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  periodButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  balanceContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
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
    height: 60,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 120,
    maxWidth: 200,
    textAlign: 'center',
    height: 50,
    padding: 0,
  },
  labelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    marginTop: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
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
    height: 50,
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
});
