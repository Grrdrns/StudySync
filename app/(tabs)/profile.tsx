import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { changeUserPassword, logOut, updateUserProfile } from '@/firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';
const PRIMARY = '#6366F1';

const CLOUDINARY_CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'studysync_uploads';

async function uploadImageToCloudinary(uri: string, onProgress?: (pct: number) => void): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri, name: 'profile.jpg', type: 'image/jpeg' } as any);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status === 200) { try { resolve(JSON.parse(xhr.responseText).secure_url); } catch { reject(new Error('Parse error')); } }
      else { reject(new Error(`Upload failed: ${xhr.status}`)); }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

type EditField = 'displayName' | 'username' | 'email' | 'age' | 'password' | null;

export default function ProfileScreen() {
  const { user, userProfile } = useFirebase();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeField, setActiveField] = useState<EditField>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const photoURL: string | null = (user as any)?.photoURL || (userProfile as any)?.photoURL || null;
  const initials = (user?.displayName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  function openField(field: EditField, current: string) {
    setActiveField(field);
    setFieldValue(current);
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try { await logOut(); router.replace('/(auth)' as any); }
        catch { Alert.alert('Error', 'Failed to logout. Please try again.'); }
      }},
    ]);
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true); setUploadPct(0);
    try {
      const url = await uploadImageToCloudinary(uri, pct => setUploadPct(pct));
      await updateUserProfile(user!.uid, { photoURL: url });
      Alert.alert('Updated!', 'Profile picture changed.');
    } catch (e: any) {
      Alert.alert('Error', `Failed to upload photo.\n${e?.message || ''}`);
    } finally { setUploadingPhoto(false); }
  }

  async function handleSaveField() {
    if (activeField === 'password') {
      if (!currentPass || !newPass || !confirmPass) { Alert.alert('Error', 'All fields are required.'); return; }
      if (newPass !== confirmPass) { Alert.alert('Error', 'New passwords do not match.'); return; }
      if (newPass.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
      setSaving(true);
      try {
        await changeUserPassword(currentPass, newPass);
        setActiveField(null);
        Alert.alert('Updated!', 'Password changed successfully.');
      } catch (e: any) {
        const msg = e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.' : e?.message || 'Failed to change password.';
        Alert.alert('Error', msg);
      } finally { setSaving(false); }
      return;
    }
    if (!fieldValue.trim()) { Alert.alert('Error', 'This field cannot be empty.'); return; }
    setSaving(true);
    try {
      if (activeField === 'displayName') await updateUserProfile(user!.uid, { displayName: fieldValue.trim() });
      else if (activeField === 'username') await updateUserProfile(user!.uid, { username: fieldValue.trim() });
      else if (activeField === 'email') await updateUserProfile(user!.uid, { email: fieldValue.trim() });
      else if (activeField === 'age') await updateUserProfile(user!.uid, { age: parseInt(fieldValue) || null });
      setActiveField(null);
      Alert.alert('Updated!', 'Changes saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save changes.');
    } finally { setSaving(false); }
  }

  const fieldConfig: { field: EditField; icon: string; iconColor: string; iconBg: string; label: string; value: string; placeholder: string; keyboard?: any }[] = [
    { field: 'displayName', icon: 'person-outline', iconColor: PRIMARY, iconBg: '#6366F122', label: 'Display Name', value: user?.displayName || '', placeholder: 'Enter display name', keyboard: 'default' },
    { field: 'username', icon: 'at-outline', iconColor: '#10B981', iconBg: '#10B98122', label: 'Username', value: userProfile?.username || '', placeholder: 'Enter username', keyboard: 'default' },
    { field: 'email', icon: 'mail-outline', iconColor: '#F59E0B', iconBg: '#F59E0B22', label: 'Email', value: user?.email || '', placeholder: 'Enter email', keyboard: 'email-address' },
    { field: 'age', icon: 'calendar-outline', iconColor: '#EC4899', iconBg: '#EC489922', label: 'Age', value: userProfile?.age ? String(userProfile.age) : '', placeholder: 'Enter age', keyboard: 'numeric' },
    { field: 'password', icon: 'lock-closed-outline', iconColor: '#EF4444', iconBg: '#EF444422', label: 'Password', value: '••••••••', placeholder: '' },
  ];

  const th = {
    bg: isDark ? '#0F172A' : '#F1F5F9',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    sheetBg: isDark ? '#1E293B' : '#FFFFFF',
    inputBg: isDark ? '#0F172A' : '#F8FAFC',
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: th.bg }]}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: th.text }]}>Settings</Text>
          <Text style={[s.headerSub, { color: th.muted }]}>Manage your account</Text>
        </View>

        {/* Avatar Card */}
        <View style={[s.avatarCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {photoURL
              ? <Image source={{ uri: photoURL }} style={s.avatarImg} />
              : <View style={s.avatarFallback}><Text style={s.avatarInitials}>{initials}</Text></View>}
            <View style={s.avatarEditBadge}>
              {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          {uploadingPhoto && (
            <View style={s.uploadProgressWrap}>
              <View style={[s.uploadProgressFill, { width: `${uploadPct}%` as any }]} />
            </View>
          )}
          <Text style={[s.avatarName, { color: th.text }]}>{user?.displayName || 'User'}</Text>
          <Text style={[s.avatarEmail, { color: th.muted }]}>{user?.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: userProfile?.role === 'teacher' ? '#8B5CF622' : '#6366F122' }]}>
            <Ionicons name={userProfile?.role === 'teacher' ? 'school-outline' : 'person-outline'} size={11} color={userProfile?.role === 'teacher' ? '#8B5CF6' : PRIMARY} />
            <Text style={[s.roleText, { color: userProfile?.role === 'teacher' ? '#8B5CF6' : PRIMARY }]}>{(userProfile?.role || 'student').toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={s.changePhotoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            <Ionicons name="images-outline" size={14} color={PRIMARY} />
            <Text style={s.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <View style={[s.section, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[s.sectionTitle, { color: th.text }]}>Appearance</Text>
          <View style={[s.acRow, { borderBottomWidth: 0 }]}>
            <View style={[s.acIconWrap, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={isDark ? '#818CF8' : '#F59E0B'} />
            </View>
            <View style={s.acMid}>
              <Text style={[s.acLabel, { color: th.muted }]}>THEME</Text>
              <Text style={[s.acValue, { color: th.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
              thumbColor={isDark ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* Account Center */}
        <View style={[s.section, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[s.sectionTitle, { color: th.text }]}>Account Center</Text>
          <Text style={[s.sectionSub, { color: th.muted }]}>Tap any field to edit</Text>
          {fieldConfig.map((item, i) => (
            <TouchableOpacity
              key={item.field}
              style={[s.acRow, i === fieldConfig.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => openField(item.field, item.value)}
              activeOpacity={0.7}>
              <View style={[s.acIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
              </View>
              <View style={s.acMid}>
                <Text style={[s.acLabel, { color: th.muted }]}>{item.label}</Text>
                <Text style={[s.acValue, { color: th.text }]} numberOfLines={1}>{item.value || '—'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={[s.section, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Logout</Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerApp}>StudySync</Text>
          <Text style={s.footerVer}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal visible={activeField !== null && activeField !== 'password'} transparent animationType="slide" onRequestClose={() => setActiveField(null)}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: th.sheetBg }]}>
              <Text style={[s.sheetTitle, { color: th.text }]}>{fieldConfig.find(f => f.field === activeField)?.label}</Text>
              <Text style={[s.sheetSub, { color: th.muted }]}>Enter a new value below and tap Save.</Text>
              <TextInput
                style={[s.input, { backgroundColor: th.inputBg, borderColor: th.border, color: th.text }]}
                value={fieldValue}
                onChangeText={setFieldValue}
                placeholder={fieldConfig.find(f => f.field === activeField)?.placeholder}
                placeholderTextColor="#475569"
                keyboardType={fieldConfig.find(f => f.field === activeField)?.keyboard || 'default'}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveField} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setActiveField(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={activeField === 'password'} transparent animationType="slide" onRequestClose={() => setActiveField(null)}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: th.sheetBg }]}>
              <Text style={[s.sheetTitle, { color: th.text }]}>Change Password</Text>
              <Text style={[s.sheetSub, { color: th.muted }]}>Enter your current password to confirm, then set a new one.</Text>
              {[
                { label: 'Current Password', value: currentPass, setter: setCurrentPass, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                { label: 'New Password', value: newPass, setter: setNewPass, show: showNew, toggle: () => setShowNew(v => !v) },
                { label: 'Confirm New Password', value: confirmPass, setter: setConfirmPass, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
              ].map(f => (
                <View key={f.label}>
                  <Text style={[s.inputLabel, { color: th.muted }]}>{f.label}</Text>
                  <View style={[s.passRow, { backgroundColor: th.inputBg, borderColor: th.border }]}>
                    <TextInput style={[s.passInput, { color: th.text }]} value={f.value} onChangeText={f.setter} secureTextEntry={!f.show} placeholder="••••••••" placeholderTextColor="#475569" />
                    <TouchableOpacity onPress={f.toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={f.show ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveField} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setActiveField(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  header: { marginBottom: 20 },
  headerTitle: { color: TEXT, fontSize: 26, fontWeight: '800' },
  headerSub: { color: MUTED, fontSize: 13, marginTop: 2 },
  // Avatar
  avatarCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, gap: 8 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: PRIMARY },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: PRIMARY, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  uploadProgressWrap: { width: '80%', height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 4, overflow: 'hidden' },
  uploadProgressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 4 },
  avatarName: { color: TEXT, fontSize: 18, fontWeight: '700' },
  avatarEmail: { color: MUTED, fontSize: 13 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: '700' },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  changePhotoText: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
  // Section
  section: { backgroundColor: SURFACE, borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  sectionTitle: { color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sectionSub: { color: MUTED, fontSize: 11, marginBottom: 12 },
  // Account center rows
  acRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  acIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  acMid: { flex: 1 },
  acLabel: { color: MUTED, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  acValue: { color: TEXT, fontSize: 14, fontWeight: '500' },
  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 10 },
  logoutText: { flex: 1, color: '#EF4444', fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerApp: { color: MUTED, fontSize: 14, fontWeight: '600' },
  footerVer: { color: '#475569', fontSize: 12, marginTop: 2 },
  // Modal
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, paddingBottom: 40 },
  sheetTitle: { color: TEXT, fontSize: 18, fontWeight: '800' },
  sheetSub: { color: MUTED, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, color: TEXT, fontSize: 15 },
  inputLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
  passInput: { flex: 1, color: TEXT, fontSize: 15 },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { backgroundColor: BORDER, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: TEXT, fontSize: 14, fontWeight: '600' },
});
