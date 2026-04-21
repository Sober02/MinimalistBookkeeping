import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import {
  Category,
  Account,
  STORAGE_KEYS,
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
} from '@/utils/accounting';

const PRESET_COLORS = [
  '#FF6B9D', '#00D2FF', '#6C63FF', '#FFB84D', '#5ED6A0',
  '#FF6B6B', '#A0A0A0', '#4ECDC4', '#F5A623', '#9B59B6',
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#1ABC9C',
  '#8E44AD', '#D35400', '#27AE60', '#2980B9', '#C0392B',
];

const CATEGORY_ICONS = [
  'restaurant-outline', 'car-outline', 'cart-outline', 'game-controller-outline',
  'home-outline', 'medkit-outline', 'wallet-outline', 'ellipsis-horizontal-outline',
  'cafe-outline', 'fitness-outline', 'book-outline', 'gift-outline',
  'airplane-outline', 'school-outline', 'paw-outline', 'musical-notes-outline',
  'football-outline', 'pizza-outline', 'water-outline', 'flash-outline',
];

const ACCOUNT_ICONS = [
  'cash-outline', 'chatbubble-outline', 'card-outline', 'business-outline',
  'wallet-outline', 'phone-portrait-outline', 'diamond-outline', 'star-outline',
];

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES as Category[]);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS as Account[]);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [colorPickerModalVisible, setColorPickerModalVisible] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'category' | 'account'>('category');

  // 新分类/账户状态
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICONS[0]);
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState(PRESET_COLORS[0]);
  const [newAccountIcon, setNewAccountIcon] = useState(ACCOUNT_ICONS[0]);

  // 自定义颜色输入
  const [customColorHex, setCustomColorHex] = useState('');

  // 使用 useFocusEffect 加载数据
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
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

  // 添加分类
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
      icon: newCategoryIcon,
      type: newCategoryType,
      isCustom: true,
    };

    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(newCategories));

    setNewCategoryName('');
    setCategoryModalVisible(false);
    Alert.alert('成功', '分类添加成功');
  };

  // 添加账户
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('提示', '请输入账户名称');
      return;
    }

    const newAccount: Account = {
      id: Date.now().toString(),
      name: newAccountName.trim(),
      color: newAccountColor,
      icon: newAccountIcon,
      isCustom: true,
    };

    const newAccounts = [...accounts, newAccount];
    setAccounts(newAccounts);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(newAccounts));

    setNewAccountName('');
    setAccountModalVisible(false);
    Alert.alert('成功', '账户添加成功');
  };

  // 删除分类
  const handleDeleteCategory = async (id: string, name: string) => {
    Alert.alert('删除确认', `确定要删除分类「${name}」吗?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newCategories = categories.filter(c => c.id !== id);
          setCategories(newCategories);
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(newCategories));
        },
      },
    ]);
  };

  // 删除账户
  const handleDeleteAccount = async (id: string, name: string) => {
    Alert.alert('删除确认', `确定要删除账户「${name}」吗?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newAccounts = accounts.filter(a => a.id !== id);
          setAccounts(newAccounts);
          await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(newAccounts));
        },
      },
    ]);
  };

  // 打开自定义颜色选择器
  const openColorPicker = (target: 'category' | 'account') => {
    setColorPickerTarget(target);
    const currentColor = target === 'category' ? newCategoryColor : newAccountColor;
    setCustomColorHex(currentColor.replace('#', ''));
    setColorPickerModalVisible(true);
  };

  // 确认自定义颜色
  const confirmCustomColor = () => {
    let hex = customColorHex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    // 验证是否为有效的 hex 颜色
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      if (colorPickerTarget === 'category') {
        setNewCategoryColor(hex);
      } else {
        setNewAccountColor(hex);
      }
      setColorPickerModalVisible(false);
    } else {
      Alert.alert('提示', '请输入有效的颜色代码，如 FF6B9D 或 #FF6B9D');
    }
  };

  return (
    <Screen backgroundColor="#0F0C29" statusBarStyle="light" safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <Text style={styles.title}>设置</Text>

        {/* 支出分类管理 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={20} color="#FF6B9D" />
              <Text style={styles.sectionTitle}>支出分类</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => { setNewCategoryType('expense'); setCategoryModalVisible(true); }}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsList}>
            {categories.filter(c => c.type === 'expense').map((category) => (
              <View key={category.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <Text style={styles.itemName}>{category.name}</Text>
                </View>
                {category.isCustom ? (
                  <TouchableOpacity onPress={() => handleDeleteCategory(category.id, category.name)}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* 收入分类管理 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={20} color="#4ECDC4" />
              <Text style={styles.sectionTitle}>收入分类</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => { setNewCategoryType('income'); setCategoryModalVisible(true); }}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsList}>
            {categories.filter(c => c.type === 'income').map((category) => (
              <View key={category.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <Text style={styles.itemName}>{category.name}</Text>
                </View>
                {category.isCustom ? (
                  <TouchableOpacity onPress={() => handleDeleteCategory(category.id, category.name)}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* 账户管理 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={20} color="#6C63FF" />
              <Text style={styles.sectionTitle}>账户管理</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAccountModalVisible(true)}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsList}>
            {accounts.map((account) => (
              <View key={account.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${account.color}20` }]}>
                    <Ionicons name={account.icon as any} size={18} color={account.color} />
                  </View>
                  <Text style={styles.itemName}>{account.name}</Text>
                </View>
                {account.isCustom ? (
                  <TouchableOpacity onPress={() => handleDeleteAccount(account.id, account.name)}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* 关于 */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.aboutText}>个人记账 v1.0</Text>
          </View>
          <Text style={styles.aboutSubtext}>毛玻璃风格 · 极简记账</Text>
        </View>

        {/* 添加分类弹窗 - 使用不透明背景 */}
        <Modal visible={categoryModalVisible} transparent animationType="slide" onRequestClose={() => setCategoryModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalCardBg}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.modalCardContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>添加分类</Text>
                    <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                      <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>

                  {/* 分类名称 */}
                  <Text style={styles.inputLabel}>分类名称</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="输入分类名称"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    maxLength={10}
                  />

                  {/* 颜色选择 */}
                  <View style={styles.colorSectionHeader}>
                    <Text style={styles.inputLabel}>选择颜色</Text>
                    <TouchableOpacity onPress={() => openColorPicker('category')}>
                      <View style={styles.customColorBtn}>
                        <Ionicons name="color-palette-outline" size={14} color="#FFF" />
                        <Text style={styles.customColorBtnText}>自定义</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.colorRow}>
                    <View style={[styles.currentColorPreview, { backgroundColor: newCategoryColor }]} />
                    <Text style={styles.currentColorHex}>{newCategoryColor}</Text>
                  </View>
                  <View style={styles.colorGrid}>
                    {PRESET_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          newCategoryColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setNewCategoryColor(color)}
                      >
                        {newCategoryColor === color && (
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 图标选择 */}
                  <Text style={styles.inputLabel}>选择图标</Text>
                  <View style={styles.iconScroll}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconGrid}>
                      {CATEGORY_ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon}
                          style={[
                            styles.iconOption,
                            newCategoryIcon === icon && {
                              borderColor: newCategoryColor,
                              backgroundColor: `${newCategoryColor}20`,
                            },
                          ]}
                          onPress={() => setNewCategoryIcon(icon)}
                        >
                          <Ionicons
                            name={icon as any}
                            size={22}
                            color={newCategoryIcon === icon ? newCategoryColor : 'rgba(255,255,255,0.5)'}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 按钮 */}
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddCategory}>
                    <Text style={styles.submitButtonText}>添加分类</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 添加账户弹窗 */}
        <Modal visible={accountModalVisible} transparent animationType="slide" onRequestClose={() => setAccountModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAccountModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalCardBg}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.modalCardContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>添加账户</Text>
                    <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                      <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>

                  {/* 账户名称 */}
                  <Text style={styles.inputLabel}>账户名称</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="输入账户名称"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={newAccountName}
                    onChangeText={setNewAccountName}
                    maxLength={10}
                  />

                  {/* 颜色选择 */}
                  <View style={styles.colorSectionHeader}>
                    <Text style={styles.inputLabel}>选择颜色</Text>
                    <TouchableOpacity onPress={() => openColorPicker('account')}>
                      <View style={styles.customColorBtn}>
                        <Ionicons name="color-palette-outline" size={14} color="#FFF" />
                        <Text style={styles.customColorBtnText}>自定义</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.colorRow}>
                    <View style={[styles.currentColorPreview, { backgroundColor: newAccountColor }]} />
                    <Text style={styles.currentColorHex}>{newAccountColor}</Text>
                  </View>
                  <View style={styles.colorGrid}>
                    {PRESET_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          newAccountColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setNewAccountColor(color)}
                      >
                        {newAccountColor === color && (
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 图标选择 */}
                  <Text style={styles.inputLabel}>选择图标</Text>
                  <View style={styles.iconScroll}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconGrid}>
                      {ACCOUNT_ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon}
                          style={[
                            styles.iconOption,
                            newAccountIcon === icon && {
                              borderColor: newAccountColor,
                              backgroundColor: `${newAccountColor}20`,
                            },
                          ]}
                          onPress={() => setNewAccountIcon(icon)}
                        >
                          <Ionicons
                            name={icon as any}
                            size={22}
                            color={newAccountIcon === icon ? newAccountColor : 'rgba(255,255,255,0.5)'}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 按钮 */}
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddAccount}>
                    <Text style={styles.submitButtonText}>添加账户</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 自定义颜色选择弹窗 */}
        <Modal visible={colorPickerModalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setColorPickerModalVisible(false)}>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorPickerBg}>
                <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.colorPickerContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>自定义颜色</Text>
                    <TouchableOpacity onPress={() => setColorPickerModalVisible(false)}>
                      <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.colorPickerHint}>请输入 Hex 颜色代码（如 FF6B9D）</Text>

                  <View style={styles.colorInputRow}>
                    <Text style={styles.colorHashLabel}>#</Text>
                    <TextInput
                      style={styles.colorHexInput}
                      value={customColorHex}
                      onChangeText={setCustomColorHex}
                      placeholder="FF6B9D"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      maxLength={6}
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* 预览 */}
                  {customColorHex.length >= 6 && (
                    <View style={styles.colorPreviewContainer}>
                      <View style={[styles.colorPreviewLarge, { backgroundColor: `#${customColorHex.replace('#', '')}` }]} />
                      <Text style={styles.colorPreviewText}>#{customColorHex.replace('#', '').toUpperCase()}</Text>
                    </View>
                  )}

                  <View style={styles.colorPickerButtons}>
                    <TouchableOpacity style={styles.colorPickerCancel} onPress={() => setColorPickerModalVisible(false)}>
                      <Text style={styles.colorPickerCancelText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.colorPickerConfirm} onPress={confirmCustomColor}>
                      <Text style={styles.colorPickerConfirmText}>确认</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  itemsList: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 14, color: '#FFFFFF' },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  aboutSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  modalCardBg: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopWidth: 0,
  },
  modalCardContent: {
    padding: 24,
    paddingTop: 20,
    backgroundColor: 'rgba(15,12,41,0.92)',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  inputLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10, marginTop: 12 },
  input: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 0, fontSize: 14, color: '#FFFFFF', height: 48 },
  colorSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  customColorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(108,99,255,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  customColorBtnText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  currentColorPreview: { width: 28, height: 28, borderRadius: 14 },
  currentColorHex: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#FFF' },
  iconScroll: { height: 56 },
  iconGrid: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  iconOption: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  submitButton: { backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  colorPickerContainer: { justifyContent: 'center', alignItems: 'center', marginHorizontal: 20 },
  colorPickerBg: { width: Dimensions.get('window').width - 60, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  colorPickerContent: { padding: 24, backgroundColor: 'rgba(15,12,41,0.95)' },
  colorPickerHint: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  colorInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  colorHashLabel: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginRight: 8 },
  colorHexInput: { flex: 1, fontSize: 18, fontWeight: '600', color: '#FFFFFF', height: 48, paddingVertical: 0, letterSpacing: 2 },
  colorPreviewContainer: { alignItems: 'center', marginTop: 16, gap: 8 },
  colorPreviewLarge: { width: 64, height: 64, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  colorPreviewText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  colorPickerButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  colorPickerCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  colorPickerCancelText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  colorPickerConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6C63FF' },
  colorPickerConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
