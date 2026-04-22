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

const RECORDS_KEY = STORAGE_KEYS.RECORDS;

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
          const stored = await AsyncStorage.getItem(RECORDS_KEY);
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
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(newRecords));
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

  // 渲染单条记录
  const renderRecord = ({ item }: { item: AccountRecord }) => {
    const category = getCategoryInfo(item.category);
    return (
      <TouchableOpacity onPress={() => handleEdit(item)} onLongPress={() => handleDelete(item.id)}>
        <GlassCard style={styles.recordCard} intensity={12}>
          <View style={styles.recordLeft}>
            <View style={[styles.recordIcon, { backgroundColor: `${category?.color || '#A0A0A0'}20` }]}>
              <Ionicons name={(category?.icon || 'ellipsis-horizontal-outline') as any} size={22} color={category?.color || '#A0A0A0'} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordCategory} numberOfLines={1}>{category?.name || '其他'}</Text>
              {item.note ? <Text style={styles.recordNote} numberOfLines={1}>{item.note}</Text> : null}
              <Text style={styles.recordDate} numberOfLines={1}>{item.date}</Text>
            </View>
          </View>
          <View style={styles.recordAmountWrap}>
            <Text style={[styles.recordAmount, { color: item.type === 'income' ? '#4ECDC4' : '#FF6B9D' }]} numberOfLines={1}>
              {item.type === 'income' ? '+' : '-'}¥{formatAmount(item.amount)}
            </Text>
          </View>
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
    <Screen backgroundColor="#0F0C29" statusBarStyle="light" safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* 标题 */}
          <Text style={styles.title}>收支明细</Text>

          {/* 搜索框 */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={[styles.searchInput, inputBaseStyle]}
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
              style={[styles.filterButton, selectedCategoryFilter !== 'all' && styles.filterButtonActive]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="funnel-outline" size={18} color={selectedCategoryFilter !== 'all' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.filterButtonText, selectedCategoryFilter !== 'all' && styles.filterButtonTextActive]}>
                {getFilterButtonText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 记录列表 */}
          <View style={styles.recordsContainer}>
            {filteredRecords.length === 0 ? (
              <GlassCard style={styles.emptyCard} intensity={15}>
                <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>暂无记录</Text>
                <Text style={styles.emptySubtext}>点击可编辑，长按可删除</Text>
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
          <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModalVisible(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
                <TouchableOpacity activeOpacity={1}>
                  <View style={styles.editModalBg}>
                    <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.editModalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>编辑记录</Text>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                          <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* 类型切换 */}
                        <View style={styles.typeToggle}>
                          <TouchableOpacity style={[styles.typeButton, editType === 'expense' && styles.typeButtonActive]} onPress={() => setEditType('expense')}>
                            <Text style={[styles.typeButtonText, editType === 'expense' && styles.typeButtonTextActive]}>支出</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.typeButton, editType === 'income' && styles.typeButtonActiveIncome]} onPress={() => setEditType('income')}>
                            <Text style={[styles.typeButtonText, editType === 'income' && styles.typeButtonTextActive]}>收入</Text>
                          </TouchableOpacity>
                        </View>

                        {/* 金额输入 */}
                        <View style={styles.amountContainer}>
                          <Text style={styles.currencySymbol}>¥</Text>
                          <TextInput
                            style={[styles.amountInput, { ...inputBaseStyle, height: 56 }]}
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="decimal-pad"
                            value={editAmount}
                            onChangeText={handleAmountChange}
                          />
                        </View>

                        {/* 分类选择 */}
                        <Text style={styles.labelText}>分类</Text>
                        <View style={styles.categoriesScroll}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                            {categories.filter(c => editType === 'expense' ? c.type === 'expense' : c.type === 'income').map((category) => (
                              <TouchableOpacity
                                key={category.id}
                                style={[styles.categoryItem, editCategory === category.id && { borderColor: category.color, backgroundColor: `${category.color}20` }]}
                                onPress={() => setEditCategory(category.id)}
                              >
                                <Ionicons name={category.icon as any} size={20} color={editCategory === category.id ? category.color : 'rgba(255,255,255,0.5)'} />
                                <Text style={[styles.categoryText, editCategory === category.id && { color: category.color }]}>{category.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* 备注 */}
                        <TextInput
                          style={[styles.noteInput, inputBaseStyle]}
                          placeholder="备注"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={editNote}
                          onChangeText={setEditNote}
                        />
                      </ScrollView>

                      {/* 按钮 */}
                      <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={() => { if (editingRecord) { handleDelete(editingRecord.id); setEditModalVisible(false); } }}>
                          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                          <Text style={styles.deleteButtonText}>删除</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit}>
                          <Text style={styles.saveButtonText}>保存</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Modal>

          {/* 筛选弹窗 */}
          <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.filterModalBg}>
                  <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.filterModalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>筛选分类</Text>
                      <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                        <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.filterOption, selectedCategoryFilter === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedCategoryFilter('all'); setFilterModalVisible(false); }}>
                      <Text style={styles.filterOptionText}>全部</Text>
                      {selectedCategoryFilter === 'all' && <Ionicons name="checkmark" size={20} color="#6C63FF" />}
                    </TouchableOpacity>

                    <Text style={styles.filterSectionTitle}>支出分类</Text>
                    {categories.filter(c => c.type === 'expense').map((category) => (
                      <TouchableOpacity key={category.id} style={[styles.filterOption, selectedCategoryFilter === category.id && styles.filterOptionActive]} onPress={() => { setSelectedCategoryFilter(category.id); setFilterModalVisible(false); }}>
                        <View style={styles.filterOptionLeft}>
                          <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                          <Ionicons name={category.icon as any} size={18} color={category.color} />
                          <Text style={styles.filterOptionText}>{category.name}</Text>
                        </View>
                        {selectedCategoryFilter === category.id && <Ionicons name="checkmark" size={20} color="#6C63FF" />}
                      </TouchableOpacity>
                    ))}

                    <Text style={styles.filterSectionTitle}>收入分类</Text>
                    {categories.filter(c => c.type === 'income').map((category) => (
                      <TouchableOpacity key={category.id} style={[styles.filterOption, selectedCategoryFilter === category.id && styles.filterOptionActive]} onPress={() => { setSelectedCategoryFilter(category.id); setFilterModalVisible(false); }}>
                        <View style={styles.filterOptionLeft}>
                          <View style={[styles.filterDot, { backgroundColor: category.color }]} />
                          <Ionicons name={category.icon as any} size={18} color={category.color} />
                          <Text style={styles.filterOptionText}>{category.name}</Text>
                        </View>
                        {selectedCategoryFilter === category.id && <Ionicons name="checkmark" size={20} color="#6C63FF" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginTop: 20, marginBottom: 20, textAlign: 'center' },
  glassCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  glassCardContent: { padding: 16 },
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, height: 48, gap: 6 },
  filterButtonActive: { backgroundColor: '#6C63FF' },
  filterButtonText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  filterButtonTextActive: { color: '#FFFFFF' },
  recordsContainer: { flex: 1 },
  listContent: { paddingBottom: 100 },
  recordCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 10 },
  recordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  recordIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  recordInfo: { marginLeft: 12, flex: 1 },
  recordCategory: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  recordNote: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  recordDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  recordAmountWrap: { justifyContent: 'center', paddingLeft: 8 },
  recordAmount: { fontSize: 16, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editModalBg: { borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderBottomWidth: 0 },
  editModalContent: { padding: 24, backgroundColor: 'rgba(15,12,41,0.94)', maxHeight: '80%' },
  filterModalBg: { margin: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  filterModalContent: { padding: 24, backgroundColor: 'rgba(15,12,41,0.94)', maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  typeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  typeButtonActive: { backgroundColor: '#FF6B9D' },
  typeButtonActiveIncome: { backgroundColor: '#4ECDC4' },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  typeButtonTextActive: { color: '#FFFFFF' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 56 },
  currencySymbol: { fontSize: 28, fontWeight: '300', color: 'rgba(255,255,255,0.5)' },
  amountInput: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', minWidth: 120, textAlign: 'center' },
  labelText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  categoriesScroll: { height: 64 },
  categoriesContainer: { flexDirection: 'row', gap: 10 },
  categoryItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', minWidth: 60 },
  categoryText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  noteInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF', marginTop: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  deleteButton: { backgroundColor: 'rgba(255,107,107,0.2)', borderWidth: 1, borderColor: '#FF6B6B' },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#FF6B6B' },
  saveButton: { backgroundColor: '#6C63FF' },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  filterOptionActive: { backgroundColor: 'rgba(108,99,255,0.15)' },
  filterOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterOptionText: { fontSize: 14, color: '#FFFFFF' },
  filterSectionTitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 12, marginBottom: 8, paddingHorizontal: 12 },
});
