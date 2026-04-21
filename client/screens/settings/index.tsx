import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAccountingData } from '@/hooks/useAccountingData';
import { Category, Account } from '@/utils/accounting';

const CATEGORY_COLORS = ['#FF6B9D', '#00D2FF', '#6C63FF', '#FFB84D', '#5ED6A0', '#FF6B6B', '#A0A0A0', '#4ECDC4', '#F5A623', '#9B59B6'];
const CATEGORY_ICONS = [
  'restaurant-outline', 'car-outline', 'cart-outline', 'game-controller-outline',
  'home-outline', 'medkit-outline', 'wallet-outline', 'ellipsis-horizontal-outline',
  'cafe-outline', 'fitness-outline', 'book-outline', 'gift-outline',
  'airplane-outline', 'school-outline', 'paw-outline', 'musical-notes-outline',
];

// 毛玻璃卡片组件
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

export default function SettingsPage() {
  const {
    categories,
    accounts,
    addCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
  } = useAccountingData();

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // 新分类/账户状态
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICONS[0]);
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState(CATEGORY_COLORS[0]);
  const [newAccountIcon, setNewAccountIcon] = useState('cash-outline');

  // 添加分类
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }

    await addCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
      icon: newCategoryIcon,
      type: newCategoryType,
    });

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

    await addAccount({
      name: newAccountName.trim(),
      color: newAccountColor,
      icon: newAccountIcon,
    });

    setNewAccountName('');
    setAccountModalVisible(false);
    Alert.alert('成功', '账户添加成功');
  };

  // 删除分类
  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert('删除确认', `确定要删除分类「${name}」吗?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(id);
        },
      },
    ]);
  };

  // 删除账户
  const handleDeleteAccount = (id: string, name: string) => {
    Alert.alert('删除确认', `确定要删除账户「${name}」吗?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteAccount(id);
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 标题 */}
        <Text style={styles.title}>设置</Text>

        {/* 支出分类管理 */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={20} color="#FF6B9D" />
              <Text style={styles.sectionTitle}>支出分类</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewCategoryType('expense');
                setCategoryModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsGrid}>
            {categories.filter(c => c.type === 'expense').map((category) => (
              <View key={category.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <Text style={styles.itemName}>{category.name}</Text>
                  {category.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>自</Text>
                    </View>
                  )}
                </View>
                {category.isCustom && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(category.id, category.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 收入分类管理 */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={20} color="#4ECDC4" />
              <Text style={styles.sectionTitle}>收入分类</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewCategoryType('income');
                setCategoryModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsGrid}>
            {categories.filter(c => c.type === 'income').map((category) => (
              <View key={category.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <Text style={styles.itemName}>{category.name}</Text>
                  {category.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>自</Text>
                    </View>
                  )}
                </View>
                {category.isCustom && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(category.id, category.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 账户管理 */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={20} color="#6C63FF" />
              <Text style={styles.sectionTitle}>账户管理</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAccountModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemsGrid}>
            {accounts.map((account) => (
              <View key={account.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <View style={[styles.itemIcon, { backgroundColor: `${account.color}20` }]}>
                    <Ionicons name={account.icon as any} size={18} color={account.color} />
                  </View>
                  <Text style={styles.itemName}>{account.name}</Text>
                  {account.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>自</Text>
                    </View>
                  )}
                </View>
                {account.isCustom && (
                  <TouchableOpacity
                    onPress={() => handleDeleteAccount(account.id, account.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 关于 */}
        <GlassCard style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.aboutText}>个人记账 v1.0</Text>
          </View>
          <Text style={styles.aboutSubtext}>毛玻璃风格 · 极简记账</Text>
        </GlassCard>

        {/* 添加分类弹窗 */}
        <Modal
          visible={categoryModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCategoryModalVisible(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <GlassCard style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>添加分类</Text>
                  <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
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
                <Text style={styles.inputLabel}>选择颜色</Text>
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.colorGrid}>
                      {CATEGORY_COLORS.map((color) => (
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
                  </ScrollView>
                </View>

                {/* 图标选择 */}
                <Text style={styles.inputLabel}>选择图标</Text>
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.iconGrid}>
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
                          color={
                            newCategoryIcon === icon
                              ? newCategoryColor
                              : 'rgba(255,255,255,0.5)'
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  </ScrollView>
                </View>

                {/* 按钮 */}
                <TouchableOpacity style={styles.submitButton} onPress={handleAddCategory}>
                  <Text style={styles.submitButtonText}>添加分类</Text>
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 添加账户弹窗 */}
        <Modal
          visible={accountModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAccountModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAccountModalVisible(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <GlassCard style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>添加账户</Text>
                  <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
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
                <Text style={styles.inputLabel}>选择颜色</Text>
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.colorGrid}>
                      {CATEGORY_COLORS.map((color) => (
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
                  </ScrollView>
                </View>

                {/* 按钮 */}
                <TouchableOpacity style={styles.submitButton} onPress={handleAddAccount}>
                  <Text style={styles.submitButtonText}>添加账户</Text>
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
    marginBottom: 24,
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
  sectionCard: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsGrid: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  customBadge: {
    backgroundColor: 'rgba(108,99,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 10,
    color: '#6C63FF',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  aboutSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
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
  inputLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#FFFFFF',
    height: 48,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  iconGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
