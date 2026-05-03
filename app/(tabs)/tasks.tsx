import SimpleDatePicker from '@/components/SimpleDatePicker';
import SimpleTimePicker from '@/components/SimpleTimePicker';
import TaskDetail from '@/components/TaskDetail';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/firebase/config';
import { Task, addTask, subscribeToTasks, toggleTaskDone } from '@/firebase/firestore';
import { cancelTaskReminders, scheduleTaskReminders } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Priority = 'High' | 'Medium' | 'Low';
type StatusFilter = 'All' | 'To Do' | 'In Progress' | 'Completed';

const PRIORITY_COLOR: Record<Priority, string> = {
  High: '#EC4899',
  Medium: '#F59E0B',
  Low: '#10B981',
};

export default function TasksScreen() {
  const { user } = useFirebase();
  const { isDark } = useTheme();
  const BG = isDark ? '#0F172A' : '#F1F5F9';
  const SURFACE = isDark ? '#1E293B' : '#FFFFFF';
  const BORDER = isDark ? '#334155' : '#E2E8F0';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const MUTED = isDark ? '#94A3B8' : '#64748B';
  const st = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    title: { color: TEXT, fontSize: 22, fontWeight: '800' },
    subtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
    avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, color: TEXT, fontSize: 14 },
    filterRow: { flexGrow: 0, marginBottom: 8 },
    filterChip: { borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: SURFACE },
    filterChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    filterChipText: { color: MUTED, fontSize: 12, fontWeight: '600' },
    filterChipTextActive: { color: '#fff' },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
    countBadge: { backgroundColor: '#6366F122', borderRadius: 99, paddingVertical: 2, paddingHorizontal: 8 },
    countBadgeText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
    card: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
    priorityBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    priorityBadgeText: { fontSize: 11, fontWeight: '700' },
    cardTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
    cardTitleDone: { textDecorationLine: 'line-through', color: MUTED },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMetaText: { color: MUTED, fontSize: 12 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    doneBtn: { padding: 2 },
    doneBtnActive: {},
    emptyText: { color: MUTED, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12 },
    dateBtnText: { color: TEXT, fontSize: 14 },
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
    fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, elevation: 4 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
    sheetTitle: { color: TEXT, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    fieldLabel: { color: MUTED, fontSize: 13, fontWeight: '500' },
    fieldInput: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 14 },
    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 8, alignItems: 'center' },
    priorityBtnText: { color: MUTED, fontSize: 13, fontWeight: '600' },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 13, alignItems: 'center' },
    cancelBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
    saveBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 13, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  }), [isDark]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date());
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<{uid:string;displayName:string;email:string}[]>([]);
  const [collaborators, setCollaborators] = useState<{uid:string;displayName:string;email:string}[]>([]);
  const [newTime, setNewTime] = useState('09:00 AM');
  const [searchingCollab, setSearchingCollab] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const unsubscribe = subscribeToTasks(user.uid, (t) => { setTasks(t); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

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
    setCollabSearch(''); setCollabResults([]);
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

  async function handleToggle(id: string, done: boolean) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (done) cancelTaskReminders(id); // cancel reminders when task is marked done
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    try { await toggleTaskDone(id, done); } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
    }
  }

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
      if (statusFilter === 'Completed') return matchSearch && t.done;
      if (statusFilter === 'To Do') return matchSearch && !t.done;
      if (statusFilter === 'In Progress') return matchSearch && !t.done;
      return matchSearch;
    });
  }, [tasks, search, statusFilter]);

  const todo = filtered.filter(t => !t.done);
  const completed = filtered.filter(t => t.done);

  function TaskCard({ item }: { item: Task }) {
    return (
      <TouchableOpacity style={st.card} onPress={() => setSelectedTask(item)} activeOpacity={0.75}>
        <View style={st.cardTop}>
          <View style={[st.priorityBadge, { backgroundColor: PRIORITY_COLOR[item.priority] + '22' }]}>
            <Text style={[st.priorityBadgeText, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
          </View>
        </View>
        <Text style={[st.cardTitle, item.done && st.cardTitleDone]}>{item.title}</Text>
        <View style={st.cardMeta}>
          <Ionicons name="book-outline" size={12} color={MUTED} />
          <Text style={st.cardMetaText}>{item.subject}</Text>
        </View>
        <View style={st.cardBottom}>
          <View style={st.cardMeta}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} />
            <Text style={st.cardMetaText}>{item.due}{item.time ? ` · ${item.time}` : ''}</Text>
          </View>
          <TouchableOpacity
            style={[st.doneBtn, item.done && st.doneBtnActive]}
            onPress={(e) => { e.stopPropagation?.(); item.id && handleToggle(item.id, !item.done); }}>
            <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={item.done ? '#10B981' : MUTED} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={(updated) => {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
          setSelectedTask(updated);
        }}
        onTaskDeleted={(id) => {
          setTasks(prev => prev.filter(t => t.id !== id));
          setSelectedTask(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <View>
          <Text style={st.title}>Task Manager</Text>
          <Text style={st.subtitle}>Manage your academic load</Text>
        </View>
        <View style={[st.avatar, { backgroundColor: '#6366F1' }]}>
          <Text style={st.avatarText}>{user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}</Text>
        </View>
      </View>

      <View style={st.searchRow}>
        <View style={st.searchBox}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={st.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {(['All', 'To Do', 'In Progress', 'Completed'] as StatusFilter[]).map(f => (
          <TouchableOpacity key={f} style={[st.filterChip, statusFilter === f && st.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[st.filterChipText, statusFilter === f && st.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>To Do</Text>
              <View style={st.countBadge}><Text style={st.countBadgeText}>{todo.length}</Text></View>
            </View>
            {todo.length === 0 ? (
              <Text style={st.emptyText}>No tasks here.</Text>
            ) : todo.map(item => <TaskCard key={item.id} item={item} />)}
          </View>

          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>Completed</Text>
              <View style={[st.countBadge, { backgroundColor: '#10B98122' }]}><Text style={[st.countBadgeText, { color: '#10B981' }]}>{completed.length}</Text></View>
            </View>
            {completed.length === 0 ? (
              <Text style={st.emptyText}>No completed tasks yet.</Text>
            ) : completed.map(item => <TaskCard key={item.id} item={item} />)}
          </View>

        </ScrollView>
      )}

      <TouchableOpacity style={st.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={st.fabText}>New Task</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={st.overlay}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>New Task</Text>
            <Text style={st.fieldLabel}>Title *</Text>
            <TextInput style={st.fieldInput} placeholder="e.g. Final Research Paper" placeholderTextColor="#4B5563" value={newTitle} onChangeText={setNewTitle} />
            <Text style={st.fieldLabel}>Subject *</Text>
            <TextInput style={st.fieldInput} placeholder="e.g. Physics" placeholderTextColor="#4B5563" value={newSubject} onChangeText={setNewSubject} />
            <Text style={st.fieldLabel}>Due Date *</Text>
            <SimpleDatePicker
              value={newDueDate}
              minimumDate={new Date()}
              onChange={(date) => setNewDueDate(date)}
            />
            <Text style={st.fieldLabel}>Time</Text>
            <SimpleTimePicker value={newTime} onChange={setNewTime} />
            <Text style={st.fieldLabel}>Priority</Text>
            <View style={st.priorityRow}>
              {(['High', 'Medium', 'Low'] as Priority[]).map((p) => (
                <TouchableOpacity key={p} style={[st.priorityBtn, newPriority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] }]} onPress={() => setNewPriority(p)}>
                  <Text style={[st.priorityBtnText, newPriority === p && { color: PRIORITY_COLOR[p] }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.fieldLabel}>Collaborators (optional)</Text>
            <View style={st.collabSearchBox}>
              <Ionicons name="search-outline" size={14} color="#94A3B8" />
              <TextInput
                style={st.collabSearchInput}
                placeholder="Search by name or email..."
                placeholderTextColor="#4B5563"
                value={collabSearch}
                onChangeText={searchCollaborators}
              />
              {searchingCollab && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            {collabResults.length > 0 && (
              <View style={st.collabDropdown}>
                {collabResults.map(c => (
                  <TouchableOpacity key={c.uid} style={st.collabResultRow} onPress={() => addCollaborator(c)}>
                    <View style={st.collabAvatar}><Text style={st.collabAvatarText}>{c.displayName.slice(0,2).toUpperCase()}</Text></View>
                    <View style={{flex:1}}>
                      <Text style={st.collabName}>{c.displayName}</Text>
                      <Text style={st.collabEmail}>{c.email}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={18} color="#818CF8" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {collaborators.length > 0 && (
              <View style={st.collabChips}>
                {collaborators.map(c => (
                  <View key={c.uid} style={st.collabChip}>
                    <Text style={st.collabChipText}>{c.displayName}</Text>
                    <TouchableOpacity onPress={() => removeCollaborator(c.uid)}>
                      <Ionicons name="close-circle" size={14} color="#818CF8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={st.sheetActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={handleAddTask}>
                <Text style={st.saveBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

