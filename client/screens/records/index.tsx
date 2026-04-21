import { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAccountingData } from '@/hooks/useAccountingData';
import { Record } from '@/utils/accounting';

const { width } = Dimensions.get('window');

// 毛玻璃卡片组件
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

export default function RecordsPage() {
  const {
    filteredRecords,
    categories,
    accounts,
    searchKeyword,
    setSearchKeyword,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    deleteRecord,
    updateRecord,
    getCategoryInfo,
    getAccountInfo,
  } = useAccountingData();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // 编辑表单状态
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editAccount, setEditAccount] = useState('');

  // 格式化金额
  const formatAmount = (value: number) => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 打开编辑弹窗
  const handleEdit = (record: Record) => {
    setEditingRecord(record);
    setEditAmount(record.amount.toString());
    setEditCategory(record.category);
    setEditNote(record.note);
    setEditType(record.type);
    setEditAccount(record.account);
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    await updateRecord(editingRecord.id, {
      amount: parseFloat(editAmount),
      category: editCategory,
      note: editNote.trim(),
      type: editType,
      account: editAccount,
    });

    setEditModalVisible(false);
    setEditingRecord(null);
    Alert.alert('成功', '修改成功');
  };

  // 删除记录
  const handleDelete = (id: string) => {
    Alert.alert('删除确认', '确定要删除这条记录吗?', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
        },
      },
    ]);
  };

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
    setEditAmount(cleaned);
  };

  // 渲染单条记录
  const renderRecord = ({ item }: { item: Record }) => {
    const category = getCategoryInfo(item.category);
    const account = getAccountInfo(item.account);

    return (
      <TouchableOpacity onPress={() => handleEdit(item)} onLongPress={() => handleDelete(item.id)}>
        <GlassCard style={styles.recordCard}>
          <View style={styles.recordLeft}>
            <View
              style={[
                styles.recordIconContainer,
                { backgroundColor: `${category?.color || '#A0A0A0'}20` },
              ]}
            >
              <Ionicons
                name={category?.icon as any || 'ellipsis-horizontal'}
                size={22}
                color={category?.color || '#A0A0A0'}
              />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordCategory}>{category?.name || '其他'}</Text>
              {item.note ? (
                <Text style={styles.recordNote} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
              <View style={styles.recordMeta}>
                <Text style={styles.recordDate}>{item.date}</Text>
                {account && (
                  <View style={styles.recordAccountBadge}>
                    <Ionicons name={account.icon as any} size={10} color={account.color} />
                    <Text style={[styles.recordAccountText, { color: account.color }]}>
                      {account.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text
            style={[
              styles.recordAmount,
              { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}
            ¥{formatAmount(item.amount)}
          </Text>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // 筛选按钮文字
  const getFilterButtonText = () => {
    if (selectedCategoryFilter !== 'all') {
      const cat = categories.find(c => c.id === selectedCategoryFilter);
      return cat?.name || '筛选';
    }
    return '筛选';
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* 标题 */}
          <Text style={styles.title}>收支明细</Text>

          {/* 搜索框 */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索备注或分类"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity onPress={() => setSearchKeyword('')}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedCategoryFilter !== 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons
                name="funnel-outline"
                size={18}
                color={selectedCategoryFilter !== 'all' ? '#FFF' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategoryFilter !== 'all' && styles.filterButtonTextActive,
                ]}
              >
                {getFilterButtonText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 记录列表 */}
          <View style={styles.recordsContainer}>
            {filteredRecords.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>暂无记录</Text>
                <Text style={styles.emptySubtext}>长按可删除记录，点击可编辑</Text>
              </GlassCard>
            ) : (
              <FlatList
                data={filteredRecords}
                renderItem={renderRecord}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>

          {/* 编辑弹窗 */}
          <Modal
            visible={editModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setEditModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setEditModalVisible(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ justifyContent: 'flex-end' }}
              >
                <TouchableOpacity activeOpacity={1}>
                  <GlassCard style={styles.editModal}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>编辑记录</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                        <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    </View>

                    {/* 类型切换 */}
                    <View style={styles.typeToggle}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editType === 'expense' && styles.typeButtonActive,
                        ]}
                        onPress={() => setEditType('expense')}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editType === 'expense' && styles.typeButtonTextActive,
                          ]}
                        >
                          支出
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editType === 'income' && styles.typeButtonActiveIncome,
                        ]}
                        onPress={() => setEditType('income')}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editType === 'income' && styles.typeButtonTextActive,
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
                        value={editAmount}
                        onChangeText={handleAmountChange}
                      />
                    </View>

                    {/* 分类选择 */}
                    <Text style={styles.labelText}>分类</Text>
                    <View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                      >
                        {categories
                          .filter(c => editType === 'expense' ? c.type === 'expense' : c.type === 'income')
                          .map((category) => (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.categoryItem,
                                editCategory === category.id && {
                                  borderColor: category.color,
                                  backgroundColor: `${category.color}20`,
                                },
                              ]}
                              onPress={() => setEditCategory(category.id)}
                            >
                              <Ionicons
                                name={category.icon as any}
                                size={20}
                                color={
                                  editCategory === category.id
                                    ? category.color
                                    : 'rgba(255,255,255,0.6)'
                                }
                              />
                              <Text
                                style={[
                                  styles.categoryText,
                                  editCategory === category.id && { color: category.color },
                                ]}
                              >
                                {category.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>

                    {/* 备注 */}
                    <TextInput
                      style={styles.noteInput}
                      placeholder="备注"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={editNote}
                      onChangeText={setEditNote}
                    />

                    {/* 按钮 */}
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.deleteButton]}
                        onPress={() => {
                          if (editingRecord) {
                            handleDelete(editingRecord.id);
                            setEditModalVisible(false);
                          }
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                        <Text style={styles.deleteButtonText}>删除</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleSaveEdit}
                      >
                        <Text style={styles.saveButtonText}>保存</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Modal>

          {/* 筛选弹窗 */}
          <Modal
            visible={filterModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFilterModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setFilterModalVisible(false)}
            >
              <TouchableOpacity activeOpacity={1}>
                <GlassCard style={styles.filterModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>筛选分类</Text>
                    <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                      <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCategoryFilter === 'all' && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCategoryFilter('all');
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>全部</Text>
                    {selectedCategoryFilter === 'all' && (
                      <Ionicons name="checkmark" size={20} color="#6C63FF" />
                    )}
                  </TouchableOpacity>

                  <Text style={styles.filterSectionTitle}>支出分类</Text>
                  {categories
                    .filter(c => c.type === 'expense')
                    .map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.filterOption,
                          selectedCategoryFilter === category.id && styles.filterOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedCategoryFilter(category.id);
                          setFilterModalVisible(false);
                        }}
                      >
                        <View style={styles.filterOptionLeft}>
                          <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                          <Ionicons name={category.icon as any} size={18} color={category.color} />
                          <Text style={styles.filterOptionText}>{category.name}</Text>
                        </View>
                        {selectedCategoryFilter === category.id && (
                          <Ionicons name="checkmark" size={20} color="#6C63FF" />
                        )}
                      </TouchableOpacity>
                    ))}

                  <Text style={styles.filterSectionTitle}>收入分类</Text>
                  {categories
                    .filter(c => c.type === 'income')
                    .map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.filterOption,
                          selectedCategoryFilter === category.id && styles.filterOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedCategoryFilter(category.id);
                          setFilterModalVisible(false);
                        }}
                      >
                        <View style={styles.filterOptionLeft}>
                          <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                          <Ionicons name={category.icon as any} size={18} color={category.color} />
                          <Text style={styles.filterOptionText}>{category.name}</Text>
                        </View>
                        {selectedCategoryFilter === category.id && (
                          <Ionicons name="checkmark" size={20} color="#6C63FF" />
                        )}
                      </TouchableOpacity>
                    ))}
                </GlassCard>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C29',
    paddingHorizontal: 20,
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
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    height: 44,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6C63FF',
  },
  filterButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  recordsContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
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
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  recordDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  recordAccountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordAccountText: {
    fontSize: 10,
  },
  recordAmount: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
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
    height: 56,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 120,
    textAlign: 'center',
    height: 50,
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
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 64,
  },
  categoryText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 16,
    height: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterModal: {
    margin: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterSectionTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
});
