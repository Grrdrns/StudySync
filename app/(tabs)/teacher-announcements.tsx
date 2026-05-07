import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Announcement, addAnnouncement, deleteAnnouncement, subscribeToAnnouncements } from '@/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Theme colors are now provided via useTheme() inside the component

type Category = 'General' | 'Exam' | 'Homework' | 'Reminder' | 'Event';

const CATEGORY_COLOR: Record<Category, string> = {
  General: '#6366F1',
  Exam: '#EC4899',
  Homework: '#F59E0B',
  Reminder: '#10B981',
  Event: '#8B5CF6',
};

export default function AnnouncementsScreen() {
  const { user, userProfile } = useFirebase();
  const { isDark, colors } = useTheme();
  const BG = colors.bg;
  const SURFACE = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const MUTED = colors.muted;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('General');
  const [pinned, setPinned] = useState(false);

  const initials = (userProfile?.displayName || user?.displayName || 'TR')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Real-time subscription to Firestore announcements
  useEffect(() => {
    const unsub = subscribeToAnnouncements(setAnnouncements);
    return () => unsub();
  }, []);

  // Pinned first, then by date (already sorted desc by Firestore, but pinned float to top)
  const sorted = [
    ...announcements.filter(a => a.pinned),
    ...announcements.filter(a => !a.pinned),
  ];

  const filtered = sorted.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  async function handlePublish() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in title and content.');
      return;
    }
    if (!user || !userProfile) return;
    setPublishing(true);
    try {
      await addAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        pinned,
        teacherUid: user.uid,
        teacherName: userProfile.displayName || 'Teacher',
      });
      setTitle(''); setContent(''); setCategory('General'); setPinned(false);
      setNewModal(false);
    } catch {
      Alert.alert('Error', 'Failed to publish announcement.');
    } finally {
      setPublishing(false);
    }
  }

  function confirmDelete(ann: Announcement) {
    Alert.alert('Delete Announcement', `Delete "${ann.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAnnouncement(ann.id!) },
    ]);
  }

  function timeAgo(ts: any) {
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <SafeAreaView style={[an.safe, { backgroundColor: BG }]} edges={['top']}>
      <View style={an.header}>
        <View>
          <Text style={[an.title, { color: TEXT }]}>Announcements</Text>
          <Text style={[an.subtitle, { color: MUTED }]}>Manage classroom updates</Text>
        </View>
        <View style={[an.avatar, { backgroundColor: '#8B5CF6' }]}>
          <Text style={an.avatarText}>{initials}</Text>
        </View>
      </View>

      <View style={an.searchRow}>
        <View style={[an.searchBox, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={[an.searchInput, { color: TEXT }]}
            placeholder="Search announcements..."
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={an.emptyBox}>
            <Ionicons name="megaphone-outline" size={48} color={MUTED} />
            <Text style={[an.emptyTitle, { color: TEXT }]}>No announcements yet</Text>
            <Text style={[an.emptySubtitle, { color: MUTED }]}>Tap "+ New Announcement" to post one for your students.</Text>
          </View>
        ) : filtered.map(item => (
          <View key={item.id} style={[an.card, { backgroundColor: SURFACE, borderColor: BORDER }, item.pinned && an.cardPinned]}>
            <View style={an.cardHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                {item.pinned && (
                  <View style={an.pinnedRow}>
                    <Ionicons name="pin" size={11} color="#818CF8" />
                    <Text style={an.pinnedText}>Pinned</Text>
                  </View>
                )}
                <Text style={[an.cardTitle, { color: TEXT }]}>{item.title}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[an.catBadge, { backgroundColor: CATEGORY_COLOR[item.category] + '22' }]}>
                  <Text style={[an.catBadgeText, { color: CATEGORY_COLOR[item.category] }]}>{item.category}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[an.cardMeta, { color: MUTED }]}>by {item.teacherName} · {timeAgo(item.createdAt)}</Text>
            <Text style={[an.cardContent, { color: MUTED }]}>{item.content}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={an.fab} onPress={() => setNewModal(true)}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={an.fabText}>New Announcement</Text>
      </TouchableOpacity>

      <Modal visible={newModal} transparent animationType="slide" onRequestClose={() => setNewModal(false)}>
        <View style={an.overlay}>
          <SafeAreaView style={[an.sheet, { backgroundColor: BG }]} edges={['bottom']}>
            <View style={an.sheetTopRow}>
              <TouchableOpacity onPress={() => setNewModal(false)} style={[an.backBtn, { backgroundColor: SURFACE, borderColor: BORDER }]}>
                <Ionicons name="arrow-back" size={18} color={TEXT} />
              </TouchableOpacity>
              <Text style={[an.sheetTitle, { color: TEXT }]}>New Announcement</Text>
              <TouchableOpacity style={[an.publishBtn, publishing && { opacity: 0.6 }]} onPress={handlePublish} disabled={publishing}>
                <Text style={an.publishBtnText}>{publishing ? 'Publishing…' : 'Publish'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text style={[an.fieldLabel, { color: MUTED }]}>Title</Text>
                <TextInput
                  style={[an.fieldInput, { backgroundColor: SURFACE, borderColor: BORDER, color: TEXT }]}
                  placeholder="e.g. Midterm Project Guidelines"
                  placeholderTextColor={MUTED}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text style={[an.fieldLabel, { color: MUTED }]}>Category</Text>
                <View style={an.catRow}>
                  {(['General', 'Exam', 'Homework', 'Reminder', 'Event'] as Category[]).map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[an.catChip, { borderColor: BORDER, backgroundColor: SURFACE }, category === c && { backgroundColor: CATEGORY_COLOR[c] + '33', borderColor: CATEGORY_COLOR[c] }]}
                      onPress={() => setCategory(c)}>
                      <Text style={[an.catChipText, { color: MUTED }, category === c && { color: CATEGORY_COLOR[c] }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[an.fieldLabel, { color: MUTED }]}>Content</Text>
                <TextInput
                  style={[an.fieldInput, { height: 120, textAlignVertical: 'top', backgroundColor: SURFACE, borderColor: BORDER, color: TEXT }]}
                  placeholder="Write your announcement here..."
                  placeholderTextColor={MUTED}
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
              </View>

              <View style={[an.toggleRow, { backgroundColor: SURFACE, borderColor: BORDER }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[an.toggleLabel, { color: TEXT }]}>Pin to top of class feed</Text>
                  <Text style={[an.toggleLabel, { fontSize: 11, color: MUTED, marginTop: 2 }]}>Pinned announcements appear first for students</Text>
                </View>
                <TouchableOpacity
                  style={[an.toggle, pinned && an.toggleOn]}
                  onPress={() => setPinned(v => !v)}>
                  <View style={[an.toggleThumb, pinned && an.toggleThumbOn]} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const an = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  emptyBox: { alignItems: 'center', gap: 12, paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  cardPinned: { borderColor: '#6366F155', backgroundColor: '#6366F108' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  catBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11 },
  cardMeta: { fontSize: 11 },
  cardContent: { fontSize: 13, lineHeight: 19 },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinnedText: { color: '#818CF8', fontSize: 11 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF6', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#000000AA' },
  sheet: { flex: 1, margin: 0, paddingHorizontal: 20, paddingTop: 16 },
  sheetTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  publishBtn: { backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 18 },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { borderRadius: 20, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 14 },
  catChipText: { fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14 },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#374151', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: '#6366F1' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#9CA3AF' },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
});
