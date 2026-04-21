import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAccountingData } from '@/hooks/useAccountingData';
import { PeriodType } from '@/utils/accounting';

const { width } = Dimensions.get('window');

const PERIOD_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: '全部', value: 'all' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
];

// 毛玻璃卡片组件
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

export default function StatsPage() {
  const {
    period,
    setPeriod,
    categoryStats,
    monthlyTrend,
    periodStats,
    categories,
    totalBalance,
    accounts,
  } = useAccountingData();

  // 格式化金额
  const formatAmount = (value: number) => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  // 饼图数据
  const pieData = categoryStats.slice(0, 6).map((stat, index) => ({
    value: stat.amount,
    color: getCategoryColor(stat.category),
    text: `${stat.percentage.toFixed(0)}%`,
    label: getCategoryName(stat.category),
  }));

  // 柱状图数据
  const barData = monthlyTrend.map((item) => [
    {
      value: item.income,
      frontColor: '#4ECDC4',
      label: item.month.slice(5),
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>收</Text>
      ),
    },
    {
      value: item.expense,
      frontColor: '#FF6B9D',
      topLabelComponent: () => (
        <Text style={[styles.barTopLabel, { color: '#FF6B9D' }]}>支</Text>
      ),
    },
  ]);

  // 账户余额数据
  const accountBalances = accounts.map(account => {
    const income = 0;
    const expense = 0;
    return { account, balance: 0 }; // 简化显示
  });

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 标题 */}
        <Text style={styles.title}>周期统计</Text>

        {/* 周期切换 */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodContainer}
          >
            {PERIOD_OPTIONS.map((option) => (
              <View
                key={option.value}
                style={[
                  styles.periodButton,
                  period === option.value && styles.periodButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    period === option.value && styles.periodButtonTextActive,
                  ]}
                  onPress={() => setPeriod(option.value)}
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 周期收支概览 */}
        <GlassCard style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>周期收支概览</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(78,205,196,0.2)' }]}>
                <Ionicons name="arrow-down" size={18} color="#4ECDC4" />
              </View>
              <Text style={styles.overviewLabel}>收入</Text>
              <Text style={[styles.overviewValue, { color: '#4ECDC4' }]}>
                ¥{formatAmount(periodStats.income)}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(255,107,157,0.2)' }]}>
                <Ionicons name="arrow-up" size={18} color="#FF6B9D" />
              </View>
              <Text style={styles.overviewLabel}>支出</Text>
              <Text style={[styles.overviewValue, { color: '#FF6B9D' }]}>
                ¥{formatAmount(periodStats.expense)}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(108,99,255,0.2)' }]}>
                <Ionicons name="wallet" size={18} color="#6C63FF" />
              </View>
              <Text style={styles.overviewLabel}>结余</Text>
              <Text style={[styles.overviewValue, { color: periodStats.balance >= 0 ? '#4ECDC4' : '#FF6B9D' }]}>
                ¥{formatAmount(periodStats.balance)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* 分类支出占比 */}
        <GlassCard style={styles.chartCard}>
          <Text style={styles.sectionTitle}>分类支出占比</Text>
          {pieData.length > 0 ? (
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor="#0F0C29"
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterLabel}>总支出</Text>
                    <Text style={styles.pieCenterValue}>
                      ¥{formatAmount(periodStats.expense)}
                    </Text>
                  </View>
                )}
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
              <Ionicons name="pie-chart-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyChartText}>暂无支出数据</Text>
            </View>
          )}
        </GlassCard>

        {/* 月度趋势对比 */}
        <GlassCard style={styles.chartCard}>
          <Text style={styles.sectionTitle}>月度收支趋势</Text>
          {monthlyTrend.length > 0 ? (
            <View style={styles.barContainer}>
              <BarChart
                data={barData.flat()}
                barWidth={20}
                spacing={20}
                roundedTop
                roundedBottom
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor="rgba(255,255,255,0.2)"
                yAxisTextStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(
                  ...monthlyTrend.map(m => Math.max(m.income, m.expense)),
                  1000
                )}
                isAnimated
                width={width - 100}
                height={180}
                yAxisLabelSuffix=" ¥"
              />
              <View style={styles.barLegend}>
                <View style={styles.barLegendItem}>
                  <View style={[styles.barLegendDot, { backgroundColor: '#4ECDC4' }]} />
                  <Text style={styles.barLegendText}>收入</Text>
                </View>
                <View style={styles.barLegendItem}>
                  <View style={[styles.barLegendDot, { backgroundColor: '#FF6B9D' }]} />
                  <Text style={styles.barLegendText}>支出</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyChartText}>暂无趋势数据</Text>
            </View>
          )}
        </GlassCard>

        {/* 账户总览 */}
        <GlassCard style={styles.accountsCard}>
          <Text style={styles.sectionTitle}>账户总览</Text>
          <View style={styles.totalBalanceContainer}>
            <Text style={styles.totalBalanceLabel}>总资产</Text>
            <Text style={styles.totalBalanceValue}>
              ¥{formatAmount(totalBalance)}
            </Text>
          </View>
          <View style={styles.accountsList}>
            {accounts.slice(0, 4).map((account) => (
              <View key={account.id} style={styles.accountItem}>
                <View style={[styles.accountIcon, { backgroundColor: `${account.color}20` }]}>
                  <Ionicons name={account.icon as any} size={18} color={account.color} />
                </View>
                <Text style={styles.accountName}>{account.name}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </ScrollView>
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
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  overviewCard: {},
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartCard: {},
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  pieCenterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legendContainer: {
    marginLeft: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginRight: 8,
    width: 40,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyChartText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 12,
  },
  barContainer: {
    alignItems: 'center',
  },
  barTopLabel: {
    fontSize: 10,
    color: '#4ECDC4',
    marginBottom: 4,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barLegendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  accountsCard: {},
  totalBalanceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  totalBalanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  totalBalanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4ECDC4',
  },
  accountsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  accountItem: {
    alignItems: 'center',
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
