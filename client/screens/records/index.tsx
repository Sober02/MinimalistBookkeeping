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
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import {
  AccountRecord,
  Category,
  formatAmount,
  STORAGE_KEYS,
  DEFAULT_CATEGORIES,
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

export default function RecordsPage() {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES as Category[]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountRecord | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // 编辑表单状态
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');

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

  // 过滤记录
  const filteredRecords = records.filter(r => {
    if (selectedCategoryFilter !== 'all' && r.category !== selectedCategoryFilter) {
      return false;
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const categoryName = getCategoryInfo(r.category)?.name || '';
      if (!r.note.toLowerCase().includes(keyword) && !categoryName.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  // 保存数据
  const saveRecords = async (newRecords: AccountRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  };

  // 获取分类信息
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // 打开编辑弹窗
  const handleEdit = (record: AccountRecord) => {
    setEditingRecord(record);
    setEditAmount(record.amount.toString());
    setEditCategory(record.category);
    setEditNote(record.note);
    setEditType(record.type);
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    const newRecords = records.map(r =>
      r.id === editingRecord.id ? { ...r, amount: parseFloat(editAmount), category: editCategory, note: editNote.trim(), type: editType } : r
    );
    await saveRecords(newRecords);
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
          const newRecords = records.filter(r => r.id !== id);
          await saveRecords(newRecords);
          setEditModalVisible(false);
        },
      },
    ]);
  };

  // 金额输入处理
  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 2) cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    if (cleaned.startsWith('-')) cleaned = cleaned.slice(1);
    setEditAmount(cleaned);
  };

  // 渲染单条记录 - 不用GlassCard，使用简单的View避免BlurView遮挡文字
  const renderRecord = ({ item }: { item: AccountRecord }) => {
    const category = getCategoryInfo(item.category);
    const catColor = category?.color || '#A0A0A0';
    const catName = category?.name || '其他';
    const catIcon = category?.icon || 'ellipsis-horizontal-outline';

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => handleEdit(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        {/* 左侧：类型色条 + 图标 */}
        <View style={[styles.recordColorBar, { backgroundColor: catColor }]} />
        <View style={[styles.recordIconWrap, { backgroundColor: `${catColor}20` }]}>
          <Ionicons name={catIcon as any} size={20} color={catColor} />
        </View>

        {/* 中间：分类 + 日期 + 备注 */}
        <View style={styles.recordMiddle}>
          <View style={styles.recordNameRow}>
            <Text style={styles.recordCatName} numberOfLines={1}>{catName}</Text>
            <View style={[styles.recordTypeTag, { backgroundColor: item.type === 'income' ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,157,0.15)' }]}>
              <Text style={[styles.recordTypeTagText, { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' }]}>
                {item.type === 'income' ? '收入' : '支出'}
              </Text>
            </View>
          </View>
          <Text style={styles.recordDateText} numberOfLines={1}>{item.date}</Text>
          {item.note ? <Text style={styles.recordNoteText} numberOfLines={1}>{item.note}</Text> : null}
        </View>

        {/* 右侧：金额 */}
        <View style={styles.recordRight}>
          <Text style={[styles.recordAmountText, { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' }]} numberOfLines={1}>
            {item.type === 'income' ? '+' : '-'}¥{formatAmount(item.amount)}
          </Text>
        </View>
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
    <Screen backgroundColor="#0F0C29" statusBarStyle="light" safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* 标题 */}
          <Text style={styles.title}>收支明细</Text>

          {/* 搜索框 */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={[styles.searchInput, inputBaseStyle]}
                placeholder="搜索备注或分类"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity onPress={() => setSearchKeyword('')}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, selectedCategoryFilter !== 'all' && styles.filterBtnActive]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="funnel-outline" size={16} color={selectedCategoryFilter !== 'all' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.filterBtnText, selectedCategoryFilter !== 'all' && styles.filterBtnTextActive]}>
                {getFilterButtonText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 记录列表 */}
          {filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>暂无记录</Text>
              <Text style={styles.emptySubtext}>点击编辑 · 长按删除</Text>
            </View>
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

        {/* 编辑弹窗 - 使用不透明背景，不用BlurView */}
        <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
          <TouchableOpacity style={styles.editOverlay} activeOpacity={1} onPress={() => setEditModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
              <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                <View style={styles.editPanel}>
                  {/* 顶部把手 */}
                  <View style={styles.editHandle} />

                  <View style={styles.editHeader}>
                    <Text style={styles.editTitle}>编辑记录</Text>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.editCloseBtn}>
                      <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.editScroll}>
                    {/* 类型切换 */}
                    <View style={styles.typeToggle}>
                      <TouchableOpacity
                        style={[styles.typeBtn, editType === 'expense' && styles.typeBtnExpense]}
                        onPress={() => setEditType('expense')}
                      >
                        <Text style={[styles.typeBtnText, editType === 'expense' && styles.typeBtnTextActive]}>支出</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeBtn, editType === 'income' && styles.typeBtnIncome]}
                        onPress={() => setEditType('income')}
                      >
                        <Text style={[styles.typeBtnText, editType === 'income' && styles.typeBtnTextActive]}>收入</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 金额 */}
                    <Text style={styles.editLabel}>金额</Text>
                    <View style={styles.editAmountRow}>
                      <Text style={styles.editCurrency}>¥</Text>
                      <TextInput
                        style={[styles.editAmountInput, inputBaseStyle, { height: 52 }]}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="decimal-pad"
                        value={editAmount}
                        onChangeText={handleAmountChange}
                      />
                    </View>

                    {/* 分类选择 */}
                    <Text style={styles.editLabel}>分类</Text>
                    <View style={styles.editCategoriesWrap}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editCategoriesRow}>
                        {categories.filter(c => editType === 'expense' ? c.type === 'expense' : c.type === 'income').map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.editCatItem,
                              editCategory === category.id && { borderColor: category.color, backgroundColor: `${category.color}20` },
                            ]}
                            onPress={() => setEditCategory(category.id)}
                          >
                            <Ionicons
                              name={category.icon as any}
                              size={18}
                              color={editCategory === category.id ? category.color : 'rgba(255,255,255,0.5)'}
                            />
                            <Text style={[styles.editCatText, editCategory === category.id && { color: category.color }]}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* 备注 */}
                    <Text style={styles.editLabel}>备注</Text>
                    <TextInput
                      style={[styles.editNoteInput, inputBaseStyle]}
                      placeholder="输入备注"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={editNote}
                      onChangeText={setEditNote}
                    />
                  </ScrollView>

                  {/* 底部按钮 */}
                  <View style={styles.editButtons}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => { if (editingRecord) handleDelete(editingRecord.id); }}>
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      <Text style={styles.deleteBtnText}>删除</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                      <Text style={styles.saveBtnText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {/* 筛选弹窗 */}
        <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
          <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.filterPanel}>
                <View style={styles.editHeader}>
                  <Text style={styles.editTitle}>筛选分类</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.filterItem, selectedCategoryFilter === 'all' && styles.filterItemActive]}
                  onPress={() => { setSelectedCategoryFilter('all'); setFilterModalVisible(false); }}
                >
                  <Text style={styles.filterItemText}>全部</Text>
                  {selectedCategoryFilter === 'all' && <Ionicons name="checkmark" size={18} color="#6C63FF" />}
                </TouchableOpacity>

                <Text style={styles.filterSectionLabel}>支出分类</Text>
                {categories.filter(c => c.type === 'expense').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.filterItem, selectedCategoryFilter === category.id && styles.filterItemActive]}
                    onPress={() => { setSelectedCategoryFilter(category.id); setFilterModalVisible(false); }}
                  >
                    <View style={styles.filterItemLeft}>
                      <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                      <Text style={styles.filterItemText}>{category.name}</Text>
                    </View>
                    {selectedCategoryFilter === category.id && <Ionicons name="checkmark" size={18} color="#6C63FF" />}
                  </TouchableOpacity>
                ))}

                <Text style={styles.filterSectionLabel}>收入分类</Text>
                {categories.filter(c => c.type === 'income').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.filterItem, selectedCategoryFilter === category.id && styles.filterItemActive]}
                    onPress={() => { setSelectedCategoryFilter(category.id); setFilterModalVisible(false); }}
                  >
                    <View style={styles.filterItemLeft}>
                      <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                      <Text style={styles.filterItemText}>{category.name}</Text>
                    </View>
                    {selectedCategoryFilter === category.id && <Ionicons name="checkmark" size={18} color="#6C63FF" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginTop: 20, marginBottom: 20, textAlign: 'center' },

  // 搜索栏
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 12, height: 48, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 12, height: 48,
  },
  filterBtnActive: { backgroundColor: '#6C63FF' },
  filterBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 列表
  listContent: { paddingBottom: 100 },
  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14, paddingLeft: 4, paddingRight: 16,
    marginBottom: 10, overflow: 'hidden',
  },
  recordColorBar: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  recordIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  recordMiddle: { flex: 1, justifyContent: 'center' },
  recordNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordCatName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  recordTypeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  recordTypeTagText: { fontSize: 10, fontWeight: '600' },
  recordDateText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  recordNoteText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  recordRight: { justifyContent: 'center', paddingLeft: 8 },
  recordAmountText: { fontSize: 16, fontWeight: '700' },

  // 空状态
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 6 },

  // 编辑弹窗
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editPanel: {
    backgroundColor: '#1A1640',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 0,
  },
  editHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  editTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  editCloseBtn: { padding: 4 },
  editScroll: { paddingHorizontal: 20, paddingBottom: 10 },

  typeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  typeBtnExpense: { backgroundColor: '#FF6B9D' },
  typeBtnIncome: { backgroundColor: '#4ECDC4' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  typeBtnTextActive: { color: '#FFFFFF' },

  editLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, marginTop: 8 },
  editAmountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 16, height: 52 },
  editCurrency: { fontSize: 24, fontWeight: '300', color: 'rgba(255,255,255,0.5)', marginRight: 8 },
  editAmountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  editCategoriesWrap: { height: 58 },
  editCategoriesRow: { flexDirection: 'row', gap: 10 },
  editCatItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  editCatText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  editNoteInput: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF',
    marginTop: 4,
  },

  editButtons: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#FF6B6B' },
  saveBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#6C63FF',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // 筛选弹窗
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  filterPanel: {
    width: width - 60, borderRadius: 24,
    backgroundColor: '#1A1640', maxHeight: '70%',
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  filterItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  filterItemActive: { backgroundColor: 'rgba(108,99,255,0.15)' },
  filterItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterItemText: { fontSize: 14, color: '#FFFFFF' },
  filterSectionLabel: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 12, marginBottom: 6, paddingHorizontal: 12 },
});
