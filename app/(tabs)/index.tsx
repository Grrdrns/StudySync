import SimpleDatePicker from '@/components/SimpleDatePicker';
import SimpleTimePicker from '@/components/SimpleTimePicker';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/firebase/config';
import { Announcement, AssignedTask, AssignedTaskSubmission, GroupSharedTask, StudyGroup, Task, addTask, submitAssignedTask, subscribeToAnnouncements, subscribeToStudentAssignedTasks, subscribeToStudentSubmissions, subscribeToStudyGroups, subscribeToTasks, toggleTaskDone, uploadAssignmentFile } from '@/firebase/firestore';
import { cancelTaskReminders, scheduleTaskReminders } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Priority = 'High' | 'Medium' | 'Low';

const PRIORITY_COLOR: Record<Priority, string> = {
  High: '#EC4899',
  Medium: '#F59E0B',
  Low: '#10B981',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─────────────────────────────────────────────
// STUDENT DASHBOARD
// ─────────────────────────────────────────────
function StudentDashboard() {
  const router = useRouter();
  const { user, userProfile } = useFirebase();
  const { isDark } = useTheme();
  const BG = isDark ? '#0F172A' : '#F1F5F9';
  const SURFACE = isDark ? '#1E293B' : '#FFFFFF';
  const BORDER = isDark ? '#334155' : '#E2E8F0';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const MUTED = isDark ? '#94A3B8' : '#64748B';
  const th = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    screen: { flex: 1, backgroundColor: BG },
    content: { padding: 18, gap: 14, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, marginBottom: 4 },
    greeting: { color: MUTED, fontSize: 13, marginBottom: 3 },
    title: { color: TEXT, fontSize: 22, fontWeight: '800' },
    avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 3, padding: 14, gap: 4 },
    statValue: { color: '#818CF8', fontSize: 26, fontWeight: '800' },
    statLabel: { color: MUTED, fontSize: 11 },
    progressBanner: { backgroundColor: '#6366F1', borderRadius: 16, padding: 16, gap: 8 },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { color: '#E0E7FF', fontSize: 14, fontWeight: '600' },
    progressPct: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    progressBarBg: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
    progressSub: { color: '#C7D2FE', fontSize: 12 },
    panel: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12 },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    taskRowDone: { opacity: 0.5 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: isDark ? '#475569' : '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
    checkboxDone: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    taskBody: { flex: 1, gap: 2 },
    taskTitle: { color: TEXT, fontSize: 14, fontWeight: '600' },
    taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
    taskMeta: { color: MUTED, fontSize: 12 },
    badge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    reminderCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: isDark ? '#F59E0B18' : '#FEF3C7', borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#F59E0B44' : '#FCD34D', padding: 14 },
    reminderIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? '#F59E0B22' : '#FDE68A', justifyContent: 'center', alignItems: 'center' },
    reminderTitle: { color: TEXT, fontSize: 13, fontWeight: '700', marginBottom: 3 },
    reminderText: { color: MUTED, fontSize: 12, lineHeight: 18 },
    ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 12, marginTop: 4 },
    ctaBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    emptyText: { color: MUTED, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
    groupCountBadge: { backgroundColor: '#6366F122', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    groupCountText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
    groupDot: { width: 10, height: 10, borderRadius: 5 },
    groupName: { color: TEXT, fontSize: 13, fontWeight: '700' },
    groupMeta: { color: MUTED, fontSize: 11, marginTop: 1 },
    annRow: { borderLeftWidth: 3, borderLeftColor: BORDER, paddingLeft: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 4 },
    annCatBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    annCatText: { fontSize: 10, fontWeight: '700' },
    annTitle: { color: TEXT, fontSize: 13, fontWeight: '700' },
    annContent: { color: MUTED, fontSize: 12, lineHeight: 17 },
    annMeta: { color: isDark ? '#475569' : '#94A3B8', fontSize: 11, marginTop: 2 },
    assignRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' },
    assignLockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444422', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    assignLockedText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
    assignSubmittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10B98122', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    assignSubmittedText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
    assignSubmitBtn: { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
    assignSubmitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
    modalTitle: { color: TEXT, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    fieldLabel: { color: MUTED, fontSize: 13, fontWeight: '500' },
    fieldInput: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 14 },
    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 8, alignItems: 'center' },
    priorityBtnText: { color: MUTED, fontSize: 13, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 13, alignItems: 'center' },
    cancelBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
    saveBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 13, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    // Collaborator styles
    collabSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10 },
    collabSearchInput: { flex: 1, color: TEXT, fontSize: 13 },
    collabDropdown: { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
    collabResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
    collabAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    collabAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    collabName: { color: TEXT, fontSize: 13, fontWeight: '600' },
    collabEmail: { color: MUTED, fontSize: 11 },
    collabChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    collabChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366F122', borderRadius: 20, borderWidth: 1, borderColor: '#6366F144', paddingVertical: 5, paddingHorizontal: 10 },
    collabChipText: { color: '#818CF8', fontSize: 12, fontWeight: '600' },
    // Announcement modal styles
    annModalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
    annModalSheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, overflow: 'hidden', maxHeight: '85%' },
    annModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    annModalStrip: { height: 3, width: '100%' },
    annModalHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    annModalTitle: { color: TEXT, fontSize: 19, fontWeight: '800', lineHeight: 26 },
    annModalMeta: { color: MUTED, fontSize: 12, marginTop: 4 },
    annModalPinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F115', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    annModalPinnedText: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
    annModalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexGrow: 0 },
    annModalContent: { color: TEXT, fontSize: 14, lineHeight: 22 },
    annModalCloseBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    annModalCloseBtnText: { color: TEXT, fontSize: 14, fontWeight: '700' },
    // Submission modal styles
    subAttachViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? '#818CF811' : '#EEF2FF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 20, marginTop: 4, borderWidth: 1, borderColor: isDark ? '#818CF833' : '#C7D2FE' },
    subAttachViewText: { flex: 1, color: '#818CF8', fontSize: 13, fontWeight: '600' },
    dropboxLabel: { color: MUTED, fontSize: 12, fontWeight: '600' },
    dropbox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 18 },
    dropboxFilled: { borderColor: '#6366F1', borderStyle: 'solid', backgroundColor: '#6366F111' },
    dropboxText: { flex: 1, color: MUTED, fontSize: 13 },
    uploadProgressWrap: { height: 6, backgroundColor: isDark ? '#1E3A5F' : '#E2E8F0', borderRadius: 6, overflow: 'hidden' },
    uploadProgressFill: { height: 6, backgroundColor: '#6366F1', borderRadius: 6 },
    uploadProgressText: { color: MUTED, fontSize: 11, marginTop: 4 },
  }), [isDark]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date());
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [newTime, setNewTime] = useState('09:00 AM');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [mySubmissions, setMySubmissions] = useState<AssignedTaskSubmission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignedTask | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFile, setSubmitFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [submitUploadPct, setSubmitUploadPct] = useState(0);
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<{uid:string;displayName:string;email:string}[]>([]);
  const [collaborators, setCollaborators] = useState<{uid:string;displayName:string;email:string}[]>([]);
  const [searchingCollab, setSearchingCollab] = useState(false);

  const pendingCount = tasks.filter((t) => !t.done).length;
  const completedCount = tasks.filter((t) => t.done).length;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const unsubscribe = subscribeToTasks(user.uid, (firebaseTasks) => {
      setTasks(firebaseTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStudyGroups(user.uid, setGroups);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStudentAssignedTasks(user.uid, setAssignedTasks);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStudentSubmissions(user.uid, setMySubmissions);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToAnnouncements(anns => {
      // pinned first
      setAnnouncements([
        ...announcements.filter(a => a.pinned),
        ...announcements.filter(a => !a.pinned),
      ]);
    });
    return () => unsub();
  }, []);

  async function searchCollaborators(text: string) {
    setCollabSearch(text);
    if (text.trim().length < 2) { setCollabResults([]); return; }
    setSearchingCollab(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const results: {uid:string;displayName:string;email:string}[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (doc.id === user?.uid) return;
        const name = (d.displayName || d.username || '').toLowerCase();
        const email = (d.email || '').toLowerCase();
        if (name.includes(text.toLowerCase()) || email.includes(text.toLowerCase())) {
          results.push({ uid: doc.id, displayName: d.displayName || d.username || 'Unknown', email: d.email || '' });
        }
      });
      setCollabResults(results);
    } catch { } finally { setSearchingCollab(false); }
  }

  function addCollaborator(c: {uid:string;displayName:string;email:string}) {
    if (collaborators.find(x => x.uid === c.uid)) return;
    setCollaborators(prev => [...prev, c]);
    setCollabSearch('');
    setCollabResults([]);
  }

  function removeCollaborator(uid: string) {
    setCollaborators(prev => prev.filter(c => c.uid !== uid));
  }

  async function handleAddTask() {
    if (!newTitle.trim() || !newSubject.trim()) {
      Alert.alert('Error', 'Please fill in Title and Subject.');
      return;
    }
    if (!user) return;
    const dueStr = newDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      const taskId = await addTask({ userId: user.uid, title: newTitle.trim(), subject: newSubject.trim(), due: dueStr, time: newTime, priority: newPriority, done: false, collaborators });
      scheduleTaskReminders(taskId, newTitle.trim(), newSubject.trim(), dueStr, newTime);
      setNewTitle(''); setNewSubject(''); setNewDueDate(new Date()); setNewPriority('Medium'); setCollaborators([]); setNewTime('09:00 AM');
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to add task.');
    }
  }

  async function toggleDone(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || !task.id) return;
    if (!task.done) cancelTaskReminders(id); // marking as done — cancel reminders
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    try {
      await toggleTaskDone(task.id, !task.done);
    } catch {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: task.done } : t));
    }
  }

  return (
    <SafeAreaView style={th.safe} edges={['top']}>
      <ScrollView style={th.screen} contentContainerStyle={th.content} showsVerticalScrollIndicator={false}>

        <View style={th.header}>
          <View>
            <Text style={th.greeting}>{getGreeting()} 👋</Text>
            <Text style={th.title}>Student Dashboard</Text>
          </View>
          <Pressable style={th.avatarBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={th.avatarText}>
              {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </Text>
          </Pressable>
        </View>

        <View style={th.statsRow}>
          <View style={[th.statCard, { borderLeftColor: '#6366F1' }]}>
            <Text style={th.statValue}>{pendingCount}</Text>
            <Text style={th.statLabel}>Pending</Text>
          </View>
          <View style={[th.statCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[th.statValue, { color: '#10B981' }]}>{completedCount}</Text>
            <Text style={th.statLabel}>Completed</Text>
          </View>
          <View style={[th.statCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={[th.statValue, { color: '#F59E0B' }]}>{tasks.length}</Text>
            <Text style={th.statLabel}>Total</Text>
          </View>
        </View>

        <View style={th.progressBanner}>
          <View style={th.progressTop}>
            <Text style={th.progressLabel}>Overall Progress</Text>
            <Text style={th.progressPct}>
              {tasks.length === 0 ? '0%' : Math.round((completedCount / tasks.length) * 100) + '%'}
            </Text>
          </View>
          <View style={th.progressBarBg}>
            <View style={[th.progressBarFill, { width: (tasks.length === 0 ? '0%' : `${Math.round((completedCount / tasks.length) * 100)}%`) as any }]} />
          </View>
          <Text style={th.progressSub}>{completedCount} of {tasks.length} tasks completed</Text>
        </View>

        <View style={th.panel}>
          <View style={th.panelHeader}>
            <Text style={th.panelTitle}>My Tasks</Text>
            <TouchableOpacity style={th.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={th.addBtnText}>Add Task</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#6366F1" style={{ marginVertical: 16 }} />
          ) : tasks.length === 0 ? (
            <Text style={th.emptyText}>No tasks yet. Tap "Add Task" to get started!</Text>
          ) : tasks.map((item) => (
            <TouchableOpacity key={item.id} style={[th.taskRow, item.done && th.taskRowDone]} onPress={() => item.id && toggleDone(item.id)} activeOpacity={0.7}>
              <View style={[th.checkbox, item.done && th.checkboxDone]}>
                {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <View style={th.taskBody}>
                <Text style={[th.taskTitle, item.done && th.taskTitleDone]}>{item.title}</Text>
                <Text style={th.taskMeta}>{item.subject} • {item.due}</Text>
              </View>
              <View style={[th.badge, { backgroundColor: PRIORITY_COLOR[item.priority] + '22' }]}>
                <Text style={[th.badgeText, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {pendingCount > 0 && (
          <View style={th.reminderCard}>
            <View style={th.reminderIconWrap}>
              <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={th.reminderTitle}>Smart Reminder</Text>
              <Text style={th.reminderText}>
                You have <Text style={{ color: '#EC4899', fontWeight: '700' }}>{pendingCount} pending task{pendingCount > 1 ? 's' : ''}</Text>. Don&apos;t forget to complete them!
              </Text>
            </View>
          </View>
        )}

        {/* ── ASSIGNED TASKS PANEL ── */}
        {assignedTasks.length > 0 && (
          <View style={th.panel}>
            <View style={th.panelHeader}>
              <Text style={th.panelTitle}>Assignments</Text>
              <View style={[th.groupCountBadge, { backgroundColor: '#EC489922' }]}>
                <Text style={[th.groupCountText, { color: '#EC4899' }]}>{assignedTasks.length}</Text>
              </View>
            </View>
            {assignedTasks.map(at => {
              const isLocked = Date.now() > at.dueDateTimestamp;
              const submitted = mySubmissions.some(s => s.assignedTaskId === at.id);
              const PC2: Record<string, string> = { High: '#EC4899', Medium: '#F59E0B', Low: '#10B981' };
              const color = PC2[at.priority] || '#6366F1';
              return (
                <View key={at.id} style={[th.assignRow, isLocked && { opacity: 0.6 }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <View style={[th.annCatBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[th.annCatText, { color }]}>{at.priority}</Text>
                      </View>
                      {isLocked && (
                        <View style={th.assignLockedBadge}>
                          <Ionicons name="lock-closed" size={9} color="#EF4444" />
                          <Text style={th.assignLockedText}>Closed</Text>
                        </View>
                      )}
                      {submitted && !isLocked && (
                        <View style={th.assignSubmittedBadge}>
                          <Ionicons name="checkmark-circle" size={9} color="#10B981" />
                          <Text style={th.assignSubmittedText}>Submitted</Text>
                        </View>
                      )}
                    </View>
                    <Text style={th.annTitle}>{at.title}</Text>
                    <Text style={th.annMeta}>{at.subject} · Due {at.dueDate} {at.dueTime}</Text>
                    <Text style={[th.annMeta, { color: '#475569' }]}>by {at.teacherName}</Text>
                  </View>
                  {!isLocked && !submitted && (
                    <TouchableOpacity style={th.assignSubmitBtn} onPress={() => setSelectedAssignment(at)}>
                      <Text style={th.assignSubmitBtnText}>Submit</Text>
                    </TouchableOpacity>
                  )}
                  {submitted && !isLocked && (
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  )}
                  {isLocked && !submitted && (
                    <Ionicons name="lock-closed" size={18} color="#EF4444" />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {announcements.length > 0 && (
          <View style={th.panel}>
            <View style={th.panelHeader}>
              <Text style={th.panelTitle}>Announcements</Text>
              <View style={[th.groupCountBadge, { backgroundColor: '#8B5CF622' }]}>
                <Text style={[th.groupCountText, { color: '#A78BFA' }]}>{announcements.length}</Text>
              </View>
            </View>
            {announcements.slice(0, 3).map(ann => {
              const CC: Record<string, string> = { General: '#6366F1', Exam: '#EC4899', Homework: '#F59E0B', Reminder: '#10B981', Event: '#8B5CF6' };
              const color = CC[ann.category] || '#6366F1';
              return (
                <TouchableOpacity key={ann.id} style={[th.annRow, ann.pinned && { borderLeftColor: '#818CF8' }]}
                  activeOpacity={0.7} onPress={() => setSelectedAnn(ann)}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {ann.pinned && <Ionicons name="pin" size={10} color="#818CF8" />}
                      <View style={[th.annCatBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[th.annCatText, { color }]}>{ann.category}</Text>
                      </View>
                    </View>
                    <Text style={th.annTitle}>{ann.title}</Text>
                    <Text style={th.annContent} numberOfLines={2}>{ann.content}</Text>
                    <Text style={th.annMeta}>by {ann.teacherName}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#475569" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={th.panel}>
          <View style={th.panelHeader}>
            <Text style={th.panelTitle}>Group Collaboration</Text>
            <View style={th.groupCountBadge}>
              <Text style={th.groupCountText}>{groups.length}</Text>
            </View>
          </View>
          {groups.length === 0 ? (
            <Text style={th.emptyText}>No group yet. Create or join a group to collaborate!</Text>
          ) : groups.map((g, idx) => (
            <TouchableOpacity key={g.id} style={th.groupRow} onPress={() => router.push('/(tabs)/collaborate' as any)} activeOpacity={0.75}>
              <View style={[th.groupDot, { backgroundColor: ['#6366F1','#EC4899','#10B981','#F59E0B','#8B5CF6'][idx % 5] }]} />
              <View style={{ flex: 1 }}>
                <Text style={th.groupName}>{g.name}</Text>
                <Text style={th.groupMeta}>{g.members.length} member{g.members.length !== 1 ? 's' : ''}{g.ownerUid === user?.uid ? ' · Owner' : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#475569" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={th.ctaBtn} onPress={() => router.push('/(tabs)/collaborate' as any)}>
            <Ionicons name="people" size={15} color="#fff" />
            <Text style={th.ctaBtnText}>{groups.length > 0 ? 'Open Team Workspace' : 'Create a Group'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Announcement detail modal */}
      {!!selectedAnn && (() => {
        const ann = selectedAnn!;
        const CC: Record<string, string> = { General: '#6366F1', Exam: '#EC4899', Homework: '#F59E0B', Reminder: '#10B981', Event: '#8B5CF6' };
        const color = CC[ann.category] || '#6366F1';
        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedAnn(null)}>
            <View style={th.annModalOverlay}>
              <View style={th.annModalSheet}>
                <View style={th.annModalHandle} />
                {/* Color accent strip */}
                <View style={[th.annModalStrip, { backgroundColor: color }]} />
                {/* Header */}
                <View style={th.annModalHeader}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {ann.pinned && (
                        <View style={th.annModalPinnedBadge}>
                          <Ionicons name="pin" size={11} color="#818CF8" />
                          <Text style={th.annModalPinnedText}>Pinned</Text>
                        </View>
                      )}
                      <View style={[th.annCatBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[th.annCatText, { color, fontSize: 12 }]}>{ann.category}</Text>
                      </View>
                    </View>
                    <Text style={th.annModalTitle}>{ann.title}</Text>
                    <Text style={th.annModalMeta}>Posted by {ann.teacherName}</Text>
                  </View>
                </View>
                {/* Content */}
                <ScrollView style={th.annModalBody} showsVerticalScrollIndicator={false}>
                  <Text style={th.annModalContent}>{ann.content}</Text>
                </ScrollView>
                <TouchableOpacity style={th.annModalCloseBtn} onPress={() => setSelectedAnn(null)}>
                  <Text style={th.annModalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Submit assignment modal */}
      {!!selectedAssignment && (() => {
        const at = selectedAssignment!;
        const PC2: Record<string, string> = { High: '#EC4899', Medium: '#F59E0B', Low: '#10B981' };
        const color = PC2[at.priority] || '#6366F1';
        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => { setSelectedAssignment(null); setSubmitFile(null); setSubmitUploadPct(0); }}>
            <View style={th.annModalOverlay}>
              <View style={th.annModalSheet}>
                <View style={th.annModalHandle} />
                <View style={[th.annModalStrip, { backgroundColor: color }]} />
                <View style={th.annModalHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={[th.annCatBadge, { backgroundColor: color + '22', alignSelf: 'flex-start' }]}>
                      <Text style={[th.annCatText, { color, fontSize: 12 }]}>{at.priority} Priority</Text>
                    </View>
                    <Text style={th.annModalTitle}>{at.title}</Text>
                    <Text style={th.annModalMeta}>{at.subject} · Due {at.dueDate} at {at.dueTime}</Text>
                    <Text style={[th.annModalMeta, { color: '#475569' }]}>Assigned by {at.teacherName}</Text>
                  </View>
                </View>
                {/* Teacher attachment link */}
                {at.attachmentUrl && (
                  <TouchableOpacity
                    style={th.subAttachViewBtn}
                    onPress={() => Linking.openURL(at.attachmentUrl!)}>
                    <Ionicons name="document-attach-outline" size={14} color="#818CF8" />
                    <Text style={th.subAttachViewText} numberOfLines={1}>{at.attachmentName || 'View Assignment File'}</Text>
                    <Ionicons name="open-outline" size={13} color="#818CF8" />
                  </TouchableOpacity>
                )}
                {at.description ? (
                  <ScrollView style={th.annModalBody} showsVerticalScrollIndicator={false}>
                    <Text style={[th.annModalContent, { marginBottom: 8 }]}>{at.description}</Text>
                  </ScrollView>
                ) : null}
                {/* Student dropbox */}
                <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 6 }}>
                  <Text style={th.dropboxLabel}>Your Submission File</Text>
                  <TouchableOpacity
                    style={[th.dropbox, submitFile && th.dropboxFilled]}
                    onPress={async () => {
                      try {
                        const result = await DocumentPicker.getDocumentAsync({
                          type: ['application/pdf', 'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'application/vnd.ms-excel',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'text/plain', '*/*'],
                          copyToCacheDirectory: true,
                        });
                        if (result.canceled) return;
                        const asset = result.assets[0];
                        setSubmitFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
                      } catch { Alert.alert('Error', 'Could not open file picker.'); }
                    }}>
                    <Ionicons name={submitFile ? 'document' : 'cloud-upload-outline'} size={22} color={submitFile ? '#6366F1' : '#475569'} />
                    <Text style={[th.dropboxText, submitFile && { color: '#6366F1' }]} numberOfLines={1}>
                      {submitFile ? submitFile.name : 'Tap to upload PDF, DOC, or other file'}
                    </Text>
                    {submitFile && (
                      <TouchableOpacity onPress={() => setSubmitFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                  {submitting && submitFile && submitUploadPct > 0 && submitUploadPct < 100 && (
                    <View style={th.uploadProgressWrap}>
                      <View style={[th.uploadProgressFill, { width: `${submitUploadPct}%` as any }]} />
                      <Text style={th.uploadProgressText}>Uploading… {submitUploadPct}%</Text>
                    </View>
                  )}
                </View>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 10 }}>
                  <TouchableOpacity
                    style={[th.annModalCloseBtn, { backgroundColor: '#6366F1' }, submitting && { opacity: 0.6 }]}
                    disabled={submitting}
                    onPress={async () => {
                      if (!user || !userProfile) return;
                      setSubmitting(true);
                      setSubmitUploadPct(0);
                      try {
                        let fileUrl: string | undefined;
                        let fileName: string | undefined;
                        let fileType: string | undefined;
                        if (submitFile) {
                          fileUrl = await uploadAssignmentFile(
                            user.uid, 'submissions', at.id!,
                            submitFile.uri, submitFile.name, submitFile.mimeType,
                            pct => setSubmitUploadPct(pct),
                          );
                          fileName = submitFile.name;
                          fileType = submitFile.mimeType;
                        }
                        await submitAssignedTask({
                          assignedTaskId: at.id!,
                          studentUid: user.uid,
                          studentName: userProfile.displayName || 'Student',
                          ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
                        });
                        setSelectedAssignment(null);
                        setSubmitFile(null);
                        setSubmitUploadPct(0);
                        Alert.alert('Submitted!', 'Your assignment has been submitted to the teacher.');
                      } catch {
                        Alert.alert('Error', 'Failed to submit. Please try again.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}>
                    <Text style={[th.annModalCloseBtnText, { color: '#fff' }]}>{submitting ? 'Submitting…' : 'Submit Assignment'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={th.annModalCloseBtn} onPress={() => { setSelectedAssignment(null); setSubmitFile(null); setSubmitUploadPct(0); }}>
                    <Text style={th.annModalCloseBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={th.modalOverlay}>
          <View style={th.modalBox}>
            <Text style={th.modalTitle}>New Task</Text>

            <Text style={th.fieldLabel}>Task Title *</Text>
            <TextInput style={th.fieldInput} placeholder="e.g. Physics Lab Report" placeholderTextColor="#4B5563" value={newTitle} onChangeText={setNewTitle} />

            <Text style={th.fieldLabel}>Subject *</Text>
            <TextInput style={th.fieldInput} placeholder="e.g. Physics" placeholderTextColor="#4B5563" value={newSubject} onChangeText={setNewSubject} />

            <Text style={th.fieldLabel}>Due Date *</Text>
            <SimpleDatePicker
              value={newDueDate}
              minimumDate={new Date()}
              onChange={(date) => setNewDueDate(date)}
            />

            <Text style={th.fieldLabel}>Time</Text>
            <SimpleTimePicker value={newTime} onChange={setNewTime} />

            <Text style={th.fieldLabel}>Priority</Text>
            <View style={th.priorityRow}>
              {(['High', 'Medium', 'Low'] as Priority[]).map((p) => (
                <TouchableOpacity key={p} style={[th.priorityBtn, newPriority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] }]} onPress={() => setNewPriority(p)}>
                  <Text style={[th.priorityBtnText, newPriority === p && { color: PRIORITY_COLOR[p] }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={th.fieldLabel}>Collaborators (optional)</Text>
            <View style={th.collabSearchBox}>
              <Ionicons name="search-outline" size={14} color="#94A3B8" />
              <TextInput
                style={th.collabSearchInput}
                placeholder="Search by name or email..."
                placeholderTextColor="#4B5563"
                value={collabSearch}
                onChangeText={searchCollaborators}
              />
              {searchingCollab && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            {collabResults.length > 0 && (
              <View style={th.collabDropdown}>
                {collabResults.map(c => (
                  <TouchableOpacity key={c.uid} style={th.collabResultRow} onPress={() => addCollaborator(c)}>
                    <View style={th.collabAvatar}>
                      <Text style={th.collabAvatarText}>{c.displayName.slice(0,2).toUpperCase()}</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={th.collabName}>{c.displayName}</Text>
                      <Text style={th.collabEmail}>{c.email}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={18} color="#818CF8" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {collaborators.length > 0 && (
              <View style={th.collabChips}>
                {collaborators.map(c => (
                  <View key={c.uid} style={th.collabChip}>
                    <Text style={th.collabChipText}>{c.displayName}</Text>
                    <TouchableOpacity onPress={() => removeCollaborator(c.uid)}>
                      <Ionicons name="close-circle" size={14} color="#818CF8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={th.modalActions}>
              <TouchableOpacity style={th.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={th.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={th.saveBtn} onPress={handleAddTask}>
                <Text style={th.saveBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// TEACHER DASHBOARD
// ─────────────────────────────────────────────
interface Student {
  id: string;
  displayName: string;
  username: string;
  email: string;
}

function TeacherDashboard() {
  const router = useRouter();
  const { user, userProfile } = useFirebase();
  const { isDark } = useTheme();
  const BG = isDark ? '#0F172A' : '#F1F5F9';
  const SURFACE = isDark ? '#1E293B' : '#FFFFFF';
  const BORDER = isDark ? '#334155' : '#E2E8F0';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const MUTED = isDark ? '#94A3B8' : '#64748B';
  const th = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    screen: { flex: 1, backgroundColor: BG },
  }), [isDark]);

  type TTab = 'tasks' | 'groups' | 'students';
  const [tab, setTab] = useState<TTab>('tasks');

  // ── All student tasks ──
  const [allTasks, setAllTasks] = useState<(Task & { ownerName?: string })[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all');

  // ── All groups ──
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [groupTasks, setGroupTasks] = useState<GroupSharedTask[]>([]);
  const [groupTab, setGroupTab] = useState<'tasks' | 'members'>('tasks');

  // Load students map for task owner names
  useEffect(() => {
    getDocs(query(collection(db, 'users'))).then(snap => {
      const list: Student[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.role === 'student') list.push({ id: d.id, displayName: data.displayName || data.username || 'Unknown', username: data.username || '', email: data.email || '' });
      });
      setStudents(list);
    });
  }, []);

  // Subscribe to all tasks
  useEffect(() => {
    const { subscribeToAllStudentTasks } = require('@/firebase/firestore');
    return subscribeToAllStudentTasks(setAllTasks);
  }, []);

  // Subscribe to all groups + auto-join teacher
  useEffect(() => {
    if (!user || !userProfile) return;
    const { subscribeToAllStudyGroups, ensureTeacherInGroup } = require('@/firebase/firestore');
    return subscribeToAllStudyGroups((groups: StudyGroup[]) => {
      setAllGroups(groups);
      // Auto-add teacher to any group they're not in yet
      groups.forEach(g => {
        if (!g.memberUids.includes(user.uid)) {
          ensureTeacherInGroup(
            g.id!,
            user.uid,
            userProfile.displayName || 'Teacher',
            userProfile.email || '',
            g.memberUids,
            g.members
          );
        }
      });
    });
  }, [user, userProfile]);

  // Subscribe to active group's tasks
  useEffect(() => {
    if (!activeGroup?.id) return;
    const { subscribeToGroupSharedTasks } = require('@/firebase/firestore');
    return subscribeToGroupSharedTasks(activeGroup.id, setGroupTasks);
  }, [activeGroup?.id]);

  // Keep activeGroup fresh
  useEffect(() => {
    if (!activeGroup?.id) return;
    const fresh = allGroups.find(g => g.id === activeGroup.id);
    if (fresh) setActiveGroup(fresh);
  }, [allGroups]);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s.displayName]));

  const filteredTasks = allTasks.filter(t => {
    if (taskFilter === 'pending') return !t.done;
    if (taskFilter === 'done') return t.done;
    return true;
  });

  const pendingCount = allTasks.filter(t => !t.done).length;
  const PC: Record<string, string> = { High: '#EC4899', Medium: '#F59E0B', Low: '#10B981' };
  const GC = ['#6366F1','#EC4899','#10B981','#F59E0B','#8B5CF6'];

  // ── Task detail modal (shared for student tasks + group tasks) ──
  type DetailTask = (Task & { ownerName?: string; isGroup?: boolean; assignedToName?: string }) | null;
  const [selectedTask, setSelectedTask] = useState<DetailTask>(null);

  // ── Member profile modal ──
  type MemberProfile = { uid: string; displayName: string; email: string; username?: string; role?: string; age?: string; gender?: string; } | null;
  const [selectedMember, setSelectedMember] = useState<MemberProfile>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  async function openMemberProfile(uid: string, displayName: string, email: string) {
    setMemberLoading(true);
    setSelectedMember({ uid, displayName, email });
    try {
      const { getDoc, doc: fsDoc } = require('firebase/firestore');
      const snap = await getDoc(fsDoc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setSelectedMember({ uid, displayName: d.displayName || displayName, email: d.email || email, username: d.username, role: d.role, age: d.age, gender: d.gender });
      }
    } catch { /* fallback to basic info already set */ }
    finally { setMemberLoading(false); }
  }

  // ── Member profile modal ──
  const AVATAR_COLORS = ['#6366F1','#EC4899','#10B981','#F59E0B','#8B5CF6','#0EA5E9'];
  const renderMemberModal = selectedMember ? (
    <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedMember(null)}>
      <View style={td.modalOverlay}>
        <View style={td.modalSheet}>
          <View style={td.modalHandle} />
          {/* Avatar + name */}
          <View style={td.mpHeader}>
            <View style={[td.mpAvatar, { backgroundColor: AVATAR_COLORS[selectedMember.displayName.charCodeAt(0) % AVATAR_COLORS.length] }]}>
              <Text style={td.mpAvatarText}>{selectedMember.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</Text>
            </View>
            <Text style={td.mpName}>{selectedMember.displayName}</Text>
            <Text style={td.mpEmail}>{selectedMember.email}</Text>
            {selectedMember.role ? (
              <View style={[td.mpRoleBadge, { backgroundColor: selectedMember.role === 'teacher' ? '#8B5CF622' : '#6366F122' }]}>
                <Text style={[td.mpRoleText, { color: selectedMember.role === 'teacher' ? '#A78BFA' : '#818CF8' }]}>{selectedMember.role.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>
          {/* Info box */}
          {memberLoading ? (
            <ActivityIndicator color="#818CF8" style={{ marginVertical: 24 }} />
          ) : (
            <View style={td.modalInfoBox}>
              <View style={td.modalInfoRow}>
                <View style={td.modalInfoIcon}><Ionicons name="person-outline" size={14} color="#818CF8" /></View>
                <View>
                  <Text style={td.modalInfoLabel}>Username</Text>
                  <Text style={td.modalInfoValue}>{selectedMember.username || '—'}</Text>
                </View>
              </View>
              <View style={td.modalInfoRow}>
                <View style={td.modalInfoIcon}><Ionicons name="mail-outline" size={14} color="#818CF8" /></View>
                <View>
                  <Text style={td.modalInfoLabel}>Email</Text>
                  <Text style={td.modalInfoValue}>{selectedMember.email}</Text>
                </View>
              </View>
              {selectedMember.role ? (
                <View style={td.modalInfoRow}>
                  <View style={td.modalInfoIcon}><Ionicons name="shield-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Role</Text>
                    <Text style={td.modalInfoValue}>{selectedMember.role}</Text>
                  </View>
                </View>
              ) : null}
              {selectedMember.age ? (
                <View style={td.modalInfoRow}>
                  <View style={td.modalInfoIcon}><Ionicons name="calendar-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Age</Text>
                    <Text style={td.modalInfoValue}>{selectedMember.age}</Text>
                  </View>
                </View>
              ) : null}
              {selectedMember.gender ? (
                <View style={[td.modalInfoRow, { borderBottomWidth: 0 }]}>
                  <View style={td.modalInfoIcon}><Ionicons name="person-circle-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Gender</Text>
                    <Text style={td.modalInfoValue}>{selectedMember.gender}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
          <TouchableOpacity style={td.modalCloseBtn} onPress={() => setSelectedMember(null)}>
            <Text style={td.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ) : null;

  // ── Shared task detail modal ──
  const renderTaskModal = selectedTask ? (() => {
    const t = selectedTask!;
    const priorityColor = PC[t.priority] || '#818CF8';
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedTask(null)}>
        <View style={td.modalOverlay}>
          <View style={td.modalSheet}>
            <View style={td.modalHandle} />
            <View style={[td.modalAccentStrip, { backgroundColor: priorityColor }]} />
            <View style={td.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={td.modalTitle}>{t.title}</Text>
                <Text style={td.modalSubject}>{t.subject}</Text>
              </View>
              <View style={[td.priorityPill, { backgroundColor: priorityColor + '22', alignSelf: 'flex-start' }]}>
                <Text style={[td.priorityPillText, { color: priorityColor }]}>{t.priority}</Text>
              </View>
            </View>
            <View style={[td.modalStatusBadge, { backgroundColor: t.done ? '#10B98115' : '#EC489915', borderColor: t.done ? '#10B98133' : '#EC489933' }]}>
              <Ionicons name={t.done ? 'checkmark-circle' : 'time-outline'} size={14} color={t.done ? '#10B981' : '#EC4899'} />
              <Text style={[td.modalStatusText, { color: t.done ? '#10B981' : '#EC4899' }]}>{t.done ? 'Completed' : 'Pending'}</Text>
            </View>
            <View style={td.modalInfoBox}>
              {t.due ? (
                <View style={[td.modalInfoRow, { borderBottomWidth: 0 }]}>
                  <View style={td.modalInfoIcon}><Ionicons name="calendar-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Due Date</Text>
                    <Text style={td.modalInfoValue}>{t.due}{(t as any).time ? `  ·  ${(t as any).time}` : ''}</Text>
                  </View>
                </View>
              ) : null}
              {!t.isGroup && t.ownerName ? (
                <View style={td.modalInfoRow}>
                  <View style={td.modalInfoIcon}><Ionicons name="person-circle-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Student</Text>
                    <Text style={td.modalInfoValue}>{t.ownerName}</Text>
                  </View>
                </View>
              ) : null}
              {t.isGroup ? (
                <View style={td.modalInfoRow}>
                  <View style={td.modalInfoIcon}><Ionicons name="person-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Assigned To</Text>
                    <Text style={[td.modalInfoValue, !t.assignedToName && { color: '#475569' }]}>
                      {t.assignedToName ? `@${t.assignedToName}` : 'Unassigned'}
                    </Text>
                  </View>
                </View>
              ) : null}
              {t.isGroup && (t as any).createdByName ? (
                <View style={td.modalInfoRow}>
                  <View style={td.modalInfoIcon}><Ionicons name="create-outline" size={14} color="#818CF8" /></View>
                  <View>
                    <Text style={td.modalInfoLabel}>Created By</Text>
                    <Text style={td.modalInfoValue}>{(t as any).createdByName}</Text>
                  </View>
                </View>
              ) : null}
              {(t as any).description ? (
                <View style={[td.modalInfoRow, { flexDirection: 'column', gap: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={td.modalInfoIcon}><Ionicons name="document-text-outline" size={14} color="#818CF8" /></View>
                    <Text style={td.modalInfoLabel}>Description</Text>
                  </View>
                  <Text style={[td.modalInfoValue, { color: '#94A3B8', fontWeight: '400', lineHeight: 20, paddingLeft: 2 }]}>{(t as any).description}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={td.modalCloseBtn} onPress={() => setSelectedTask(null)}>
              <Text style={td.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  })() : null;

  // ── Group detail view ──
  if (activeGroup) {
    const done = groupTasks.filter(t => t.done).length;
    const completion = groupTasks.length === 0 ? 0 : Math.round((done / groupTasks.length) * 100);
    return (
      <SafeAreaView style={th.safe} edges={['top']}>
        {/* Group header */}
        <View style={td.groupHeader}>
          <TouchableOpacity onPress={() => { setActiveGroup(null); setGroupTasks([]); }} style={td.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#F1F5F9" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={td.groupHeaderTitle} numberOfLines={1}>{activeGroup.name}</Text>
            <Text style={td.groupHeaderSub}>{activeGroup.members.length} members · by {activeGroup.ownerName}</Text>
          </View>
          <View style={td.readOnlyBadge}><Text style={td.readOnlyText}>Read-only</Text></View>
        </View>

        {/* Progress bar */}
        <View style={td.progressWrap}>
          <View style={td.progressTrack}>
            <View style={[td.progressBar, { width: `${completion}%` as any }]} />
          </View>
          <Text style={td.progressLabel}>{done}/{groupTasks.length} done · {completion}%</Text>
        </View>

        {/* Sub-tabs */}
        <View style={td.subTabRow}>
          {(['tasks', 'members'] as const).map(t => (
            <TouchableOpacity key={t} style={[td.subTab, groupTab === t && td.subTabActive]} onPress={() => setGroupTab(t)}>
              <Ionicons name={t === 'tasks' ? 'checkbox-outline' : 'people-outline'} size={15} color={groupTab === t ? '#818CF8' : '#475569'} />
              <Text style={[td.subTabText, groupTab === t && td.subTabTextActive]}>
                {t === 'tasks' ? 'Tasks' : 'Members'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={th.screen} contentContainerStyle={td.listContent} showsVerticalScrollIndicator={false}>
          {groupTab === 'tasks' && (
            groupTasks.length === 0
              ? <View style={td.emptyWrap}><Ionicons name="checkbox-outline" size={36} color="#334155" /><Text style={td.emptyText}>No tasks yet in this group.</Text></View>
              : groupTasks.map(task => (
                <TouchableOpacity key={task.id} style={td.taskCard} activeOpacity={0.75}
                  onPress={() => setSelectedTask({ ...task, isGroup: true } as any)}>
                  <View style={[td.taskCardAccent, { backgroundColor: PC[task.priority] }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={td.taskCardTop}>
                      <View style={[td.taskDot, { backgroundColor: task.done ? '#10B981' : '#334155' }]}>
                        {task.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      <Text style={[td.taskCardTitle, task.done && td.taskCardDone]} numberOfLines={1}>{task.title}</Text>
                    </View>
                    <Text style={td.taskCardMeta}>{task.subject}</Text>
                    <View style={td.taskCardRow}>
                      <View style={td.taskCardChip}>
                        <Ionicons name="calendar-outline" size={10} color="#475569" />
                        <Text style={td.taskCardChipText}>{task.due}{task.time ? ` · ${task.time}` : ''}</Text>
                      </View>
                      <View style={[td.taskCardChip, { backgroundColor: task.assignedToName ? '#6366F115' : 'transparent' }]}>
                        <Ionicons name="person-outline" size={10} color={task.assignedToName ? '#818CF8' : '#475569'} />
                        <Text style={[td.taskCardChipText, task.assignedToName && { color: '#818CF8' }]}>
                          {task.assignedToName ? `@${task.assignedToName}` : 'Unassigned'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[td.priorityPill, { backgroundColor: PC[task.priority] + '22' }]}>
                    <Text style={[td.priorityPillText, { color: PC[task.priority] }]}>{task.priority}</Text>
                  </View>
                </TouchableOpacity>
              ))
          )}

          {groupTab === 'members' && (
            activeGroup.members.length === 0
              ? <View style={td.emptyWrap}><Text style={td.emptyText}>No members.</Text></View>
              : activeGroup.members.map((m, idx) => (
                <TouchableOpacity key={m.uid} style={td.memberCard} activeOpacity={0.75}
                  onPress={() => openMemberProfile(m.uid, m.displayName, m.email)}>
                  <View style={[td.memberAvatar, { backgroundColor: GC[idx % GC.length] }]}>
                    <Text style={td.memberAvatarText}>{m.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={td.memberName}>{m.displayName}</Text>
                    <Text style={td.memberEmail}>{m.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {m.uid === activeGroup.ownerUid && <View style={td.ownerBadge}><Text style={td.ownerBadgeText}>Owner</Text></View>}
                    {m.uid === user?.uid && <View style={td.youBadge}><Text style={td.youBadgeText}>You</Text></View>}
                    <Ionicons name="chevron-forward" size={14} color="#334155" />
                  </View>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>
        {renderTaskModal}
        {renderMemberModal}
      </SafeAreaView>
    );
  }

  // ── Main teacher dashboard ──
  return (
    <SafeAreaView style={th.safe} edges={['top']}>

      {/* Header */}
      <View style={td.mainHeader}>
        <View>
          <Text style={td.mainGreeting}>{getGreeting()}</Text>
          <Text style={td.mainTitle}>Teacher Dashboard</Text>
        </View>
        <Pressable style={td.avatar} onPress={() => router.push('/(tabs)/profile' as any)}>
          <Text style={td.avatarText}>
            {userProfile?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
          </Text>
        </Pressable>
      </View>

      {/* Stat row */}
      <View style={td.statRow}>
        <View style={td.statBox}>
          <Text style={[td.statNum, { color: '#818CF8' }]}>{students.length}</Text>
          <Text style={td.statLbl}>Students</Text>
        </View>
        <View style={td.statDivider} />
        <View style={td.statBox}>
          <Text style={[td.statNum, { color: '#EC4899' }]}>{pendingCount}</Text>
          <Text style={td.statLbl}>Pending</Text>
        </View>
        <View style={td.statDivider} />
        <View style={td.statBox}>
          <Text style={[td.statNum, { color: '#10B981' }]}>{allTasks.filter(t=>t.done).length}</Text>
          <Text style={td.statLbl}>Done</Text>
        </View>
        <View style={td.statDivider} />
        <View style={td.statBox}>
          <Text style={[td.statNum, { color: '#A78BFA' }]}>{allGroups.length}</Text>
          <Text style={td.statLbl}>Groups</Text>
        </View>
      </View>

      {/* Main tabs */}
      <View style={td.mainTabRow}>
        {(['tasks', 'groups', 'students'] as const).map(t => (
          <TouchableOpacity key={t} style={[td.mainTab, tab === t && td.mainTabActive]} onPress={() => setTab(t)}>
            <Ionicons
              name={t === 'tasks' ? 'clipboard-outline' : t === 'groups' ? 'people-outline' : 'school-outline'}
              size={15}
              color={tab === t ? '#818CF8' : '#475569'}
            />
            <Text style={[td.mainTabText, tab === t && td.mainTabTextActive]}>
              {t === 'tasks' ? 'Tasks' : t === 'groups' ? 'Groups' : 'Students'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── STUDENT TASKS ── */}
      {tab === 'tasks' && (
        <ScrollView style={th.screen} contentContainerStyle={td.listContent} showsVerticalScrollIndicator={false}>
          {/* Filter pills */}
          <View style={td.filterRow}>
            {(['all', 'pending', 'done'] as const).map(f => (
              <TouchableOpacity key={f} style={[td.filterPill, taskFilter === f && td.filterPillActive]} onPress={() => setTaskFilter(f)}>
                <Text style={[td.filterPillText, taskFilter === f && td.filterPillTextActive]}>
                  {f === 'all' ? `All  ${allTasks.length}` : f === 'pending' ? `Pending  ${pendingCount}` : `Done  ${allTasks.length - pendingCount}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredTasks.length === 0
            ? <View style={td.emptyWrap}><Ionicons name="clipboard-outline" size={36} color="#334155" /><Text style={td.emptyText}>No tasks found.</Text></View>
            : filteredTasks.map(task => (
              <TouchableOpacity key={task.id} style={td.taskCard} activeOpacity={0.75}
                onPress={() => setSelectedTask({ ...task, ownerName: studentMap[task.userId] || 'Unknown' })}>
                <View style={[td.taskCardAccent, { backgroundColor: PC[task.priority] }]} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={td.taskCardTop}>
                    <View style={[td.taskDot, { backgroundColor: task.done ? '#10B981' : '#334155' }]}>
                      {task.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                    <Text style={[td.taskCardTitle, task.done && td.taskCardDone]} numberOfLines={1}>{task.title}</Text>
                  </View>
                  <Text style={td.taskCardMeta}>{task.subject}{task.due ? ` · Due ${task.due}` : ''}</Text>
                  <View style={td.taskCardRow}>
                    <View style={td.studentChip}>
                      <Ionicons name="person-circle-outline" size={12} color="#6366F1" />
                      <Text style={td.studentChipText}>{studentMap[task.userId] || 'Unknown'}</Text>
                    </View>
                  </View>
                </View>
                <View style={[td.priorityPill, { backgroundColor: PC[task.priority] + '22' }]}>
                  <Text style={[td.priorityPillText, { color: PC[task.priority] }]}>{task.priority}</Text>
                </View>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      )}

      {/* ── GROUPS ── */}
      {tab === 'groups' && (
        <ScrollView style={th.screen} contentContainerStyle={td.listContent} showsVerticalScrollIndicator={false}>
          {allGroups.length === 0
            ? <View style={td.emptyWrap}><Ionicons name="people-outline" size={36} color="#334155" /><Text style={td.emptyText}>No groups yet.</Text></View>
            : allGroups.map((g, idx) => (
              <TouchableOpacity key={g.id} style={td.groupCard} onPress={() => { setActiveGroup(g); setGroupTab('tasks'); }} activeOpacity={0.75}>
                <View style={[td.groupCardIcon, { backgroundColor: GC[idx % GC.length] + '22' }]}>
                  <Ionicons name="people" size={20} color={GC[idx % GC.length]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={td.groupCardName}>{g.name}</Text>
                  <Text style={td.groupCardSub}>Owner: {g.ownerName}</Text>
                  <View style={td.groupCardMemberRow}>
                    <Ionicons name="person-outline" size={11} color="#475569" />
                    <Text style={td.groupCardMemberText}>{g.members.length} member{g.members.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#334155" />
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <ScrollView style={th.screen} contentContainerStyle={td.listContent} showsVerticalScrollIndicator={false}>
          {students.length === 0
            ? <View style={td.emptyWrap}><Ionicons name="school-outline" size={36} color="#334155" /><Text style={td.emptyText}>No students registered yet.</Text></View>
            : students.map((st, idx) => (
              <TouchableOpacity key={st.id} style={td.memberCard} activeOpacity={0.75}
                onPress={() => openMemberProfile(st.id, st.displayName, st.email)}>
                <View style={[td.memberAvatar, { backgroundColor: GC[idx % GC.length] }]}>
                  <Text style={td.memberAvatarText}>{st.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={td.memberName}>{st.displayName}</Text>
                  <Text style={td.memberEmail}>{st.email}</Text>
                  {st.username ? <Text style={[td.memberEmail, { color: '#6366F1', marginTop: 2 }]}>@{st.username}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#334155" />
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      )}

      {/* ── TASK DETAIL MODAL ── */}
      {renderTaskModal}
      {renderMemberModal}

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// ROOT — role-based router
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { userProfile, loading } = useFirebase();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  if (userProfile?.role === 'teacher' || userProfile?.role === 'admin') {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const BG = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, marginBottom: 4 },
  greeting: { color: MUTED, fontSize: 13, marginBottom: 3 },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 3, padding: 14, gap: 4 },
  statValue: { color: '#818CF8', fontSize: 26, fontWeight: '800' },
  statLabel: { color: MUTED, fontSize: 11 },
  progressBanner: { backgroundColor: '#6366F1', borderRadius: 16, padding: 16, gap: 8 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#E0E7FF', fontSize: 14, fontWeight: '600' },
  progressPct: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
  progressSub: { color: '#C7D2FE', fontSize: 12 },
  panel: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  taskRowDone: { opacity: 0.5 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { color: TEXT, fontSize: 14, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
  taskMeta: { color: MUTED, fontSize: 12 },
  badge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  reminderCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F59E0B18', borderRadius: 14, borderWidth: 1, borderColor: '#F59E0B44', padding: 14 },
  reminderIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F59E0B22', justifyContent: 'center', alignItems: 'center' },
  reminderTitle: { color: TEXT, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  reminderText: { color: MUTED, fontSize: 12, lineHeight: 18 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  ctaBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyText: { color: MUTED, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12 },
  dateBtnText: { color: '#F1F5F9', fontSize: 14 },
  collabSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, paddingVertical: 10 },
  collabSearchInput: { flex: 1, color: '#F1F5F9', fontSize: 13 },
  collabDropdown: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  collabResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  collabAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  collabAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  collabName: { color: '#F1F5F9', fontSize: 13, fontWeight: '600' },
  collabEmail: { color: '#94A3B8', fontSize: 11 },
  collabChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  collabChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366F122', borderRadius: 20, borderWidth: 1, borderColor: '#6366F144', paddingVertical: 5, paddingHorizontal: 10 },
  collabChipText: { color: '#818CF8', fontSize: 12, fontWeight: '600' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { color: '#F3F4F6', fontSize: 13, fontWeight: '700' },
  studentName: { color: TEXT, fontSize: 14, fontWeight: '600' },
  studentMeta: { color: MUTED, fontSize: 12 },
  roleBadge: { backgroundColor: '#6366F122', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  roleBadgeText: { color: '#818CF8', fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  fieldLabel: { color: MUTED, fontSize: 13, fontWeight: '500' },
  fieldInput: { backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 14 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 8, alignItems: 'center' },
  priorityBtnText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  groupCountBadge: { backgroundColor: '#6366F122', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  groupCountText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { color: TEXT, fontSize: 13, fontWeight: '700' },
  groupMeta: { color: MUTED, fontSize: 11, marginTop: 1 },
  annRow: { borderLeftWidth: 3, borderLeftColor: '#334155', paddingLeft: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 4 },
  annCatBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  annCatText: { fontSize: 10, fontWeight: '700' },
  annTitle: { color: TEXT, fontSize: 13, fontWeight: '700' },
  annContent: { color: MUTED, fontSize: 12, lineHeight: 17 },
  annMeta: { color: '#475569', fontSize: 11, marginTop: 2 },
  // Announcement detail modal
  annModalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  annModalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, overflow: 'hidden', maxHeight: '85%' },
  annModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  annModalStrip: { height: 3, width: '100%' },
  annModalHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  annModalTitle: { color: '#F1F5F9', fontSize: 19, fontWeight: '800', lineHeight: 26 },
  annModalMeta: { color: '#475569', fontSize: 12, marginTop: 4 },
  annModalPinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F115', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  annModalPinnedText: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
  annModalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexGrow: 0 },
  annModalContent: { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },
  annModalCloseBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#334155', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  annModalCloseBtnText: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  // Assigned tasks panel
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  assignLockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444422', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  assignLockedText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
  assignSubmittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10B98122', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  assignSubmittedText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
  assignSubmitBtn: { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  assignSubmitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Assignment submission modal
  subAttachViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#818CF811', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 20, marginTop: 4, borderWidth: 1, borderColor: '#818CF833' },
  subAttachViewText: { flex: 1, color: '#818CF8', fontSize: 13, fontWeight: '600' },
  dropboxLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  dropbox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#334155', borderStyle: 'dashed', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 18 },
  dropboxFilled: { borderColor: '#6366F1', borderStyle: 'solid', backgroundColor: '#6366F111' },
  dropboxText: { flex: 1, color: '#475569', fontSize: 13 },
  uploadProgressWrap: { height: 6, backgroundColor: '#1E3A5F', borderRadius: 6, overflow: 'hidden' },
  uploadProgressFill: { height: 6, backgroundColor: '#6366F1', borderRadius: 6 },
  uploadProgressText: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
});

// ── Teacher Dashboard dedicated styles ──
const td = StyleSheet.create({
  // Main header
  mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#0F172A' },
  mainGreeting: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  mainTitle: { color: '#F1F5F9', fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  // Stat row
  statRow: { flexDirection: 'row', backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#334155', marginVertical: 4 },
  // Main tabs
  mainTabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1E293B', borderRadius: 14, padding: 4, gap: 4 },
  mainTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  mainTabActive: { backgroundColor: '#0F172A' },
  mainTabText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  mainTabTextActive: { color: '#818CF8' },
  // List content
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  filterPill: { borderRadius: 20, borderWidth: 1.5, borderColor: '#334155', paddingVertical: 6, paddingHorizontal: 14 },
  filterPillActive: { backgroundColor: '#6366F115', borderColor: '#6366F1' },
  filterPillText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  filterPillTextActive: { color: '#818CF8' },
  // Task card
  taskCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1E293B', borderRadius: 14, overflow: 'hidden', padding: 14, gap: 12 },
  taskCardAccent: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  taskCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskDot: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  taskCardTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: '700', flex: 1 },
  taskCardDone: { textDecorationLine: 'line-through', color: '#475569' },
  taskCardMeta: { color: '#64748B', fontSize: 12 },
  taskCardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  taskCardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  taskCardChipText: { color: '#64748B', fontSize: 11 },
  studentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F115', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  studentChipText: { color: '#818CF8', fontSize: 11, fontWeight: '600' },
  // Priority pill
  priorityPill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
  priorityPillText: { fontSize: 11, fontWeight: '800' },
  // Group card
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 14, gap: 12 },
  groupCardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupCardName: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  groupCardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  groupCardMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  groupCardMemberText: { color: '#475569', fontSize: 11 },
  // Empty
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { color: '#475569', fontSize: 14 },
  // Group detail header
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  groupHeaderTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  groupHeaderSub: { color: '#64748B', fontSize: 12, marginTop: 1 },
  readOnlyBadge: { backgroundColor: '#8B5CF622', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  readOnlyText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0F172A' },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: '#818CF8', borderRadius: 3 },
  progressLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', minWidth: 90, textAlign: 'right' },
  // Sub-tabs
  subTabRow: { flexDirection: 'row', backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#818CF8' },
  subTabText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  subTabTextActive: { color: '#818CF8' },
  // Member card
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 14, gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  memberName: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  memberEmail: { color: '#64748B', fontSize: 12, marginTop: 2 },
  ownerBadge: { backgroundColor: '#F59E0B22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ownerBadgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  youBadge: { backgroundColor: '#8B5CF622', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  youBadgeText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  // Task detail modal
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalAccentStrip: { height: 3, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  modalTitle: { color: '#F1F5F9', fontSize: 20, fontWeight: '800', flexShrink: 1 },
  modalSubject: { color: '#64748B', fontSize: 13, marginTop: 3 },
  modalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 14, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  modalStatusText: { fontSize: 12, fontWeight: '700' },
  modalInfoBox: { marginHorizontal: 20, backgroundColor: '#0F172A', borderRadius: 14, padding: 4, marginBottom: 20 },
  modalInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  modalInfoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#6366F115', justifyContent: 'center', alignItems: 'center' },
  modalInfoLabel: { color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  modalInfoValue: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  modalCloseBtn: { marginHorizontal: 20, backgroundColor: '#334155', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCloseBtnText: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  // Member profile modal
  mpHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  mpAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mpAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  mpName: { color: '#F1F5F9', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  mpEmail: { color: '#64748B', fontSize: 13, marginBottom: 10 },
  mpRoleBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  mpRoleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
