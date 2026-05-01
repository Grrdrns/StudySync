import SimpleDatePicker from '@/components/SimpleDatePicker';
import SimpleTimePicker from '@/components/SimpleTimePicker';
import { useFirebase } from '@/contexts/FirebaseContext';
import { db } from '@/firebase/config';
import {
    Task,
    TaskMessage,
    addTaskMessage,
    deleteTask,
    removeSharedTaskForUser,
    shareTaskWithCollaborator,
    subscribeToTaskMessages,
    syncSharedTaskUpdates,
    toggleTaskDone,
    updateTask,
} from '@/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';

type Priority = 'High' | 'Medium' | 'Low';
const PRIORITY_COLOR: Record<Priority, string> = {
  High: '#EC4899',
  Medium: '#F59E0B',
  Low: '#10B981',
};

interface Props {
  task: Task;
  onClose: () => void;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (id: string) => void;
}

export default function TaskDetail({ task, onClose, onTaskUpdated, onTaskDeleted }: Props) {
  const { user, userProfile } = useFirebase();

  // ── Edit state ──
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editSubject, setEditSubject] = useState(task.subject);
  const [editDue, setEditDue] = useState(() => {
    const d = new Date(task.due);
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editTime, setEditTime] = useState(task.time || '09:00 AM');
  const [saving, setSaving] = useState(false);

  // ── Collaborators state ──
  const [collaborators, setCollaborators] = useState<{ uid: string; displayName: string; email: string }[]>(
    task.collaborators || []
  );
  const [collabSearch, setCollabSearch] = useState('');
  const [collabResults, setCollabResults] = useState<{ uid: string; displayName: string; email: string }[]>([]);
  const [searchingCollab, setSearchingCollab] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  // ── Messages state ──
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // sharedTaskId = the canonical message thread ID (original task's ID)
  const messageThreadId = task.sharedTaskId || task.id;

  useEffect(() => {
    if (!messageThreadId) return;
    const unsub = subscribeToTaskMessages(messageThreadId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [messageThreadId]);

  // ── Save edits ──
  async function handleSave() {
    if (!editTitle.trim() || !editSubject.trim()) {
      Alert.alert('Error', 'Title and Subject are required.');
      return;
    }
    if (!task.id) return;
    setSaving(true);
    const dueStr = editDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      const updates = { title: editTitle.trim(), subject: editSubject.trim(), due: dueStr, time: editTime, priority: editPriority, collaborators };
      await updateTask(task.id, updates);
      // Sync to all collaborator copies
      if (!task.isShared) await syncSharedTaskUpdates(task.id, updates);
      onTaskUpdated({ ...task, ...updates });
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle done ──
  async function handleToggleDone() {
    if (!task.id) return;
    try {
      await toggleTaskDone(task.id, !task.done);
      onTaskUpdated({ ...task, done: !task.done });
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    }
  }

  // ── Delete task ──
  function handleDelete() {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!task.id) return;
          try {
            await deleteTask(task.id);
            onTaskDeleted(task.id);
            onClose();
          } catch {
            Alert.alert('Error', 'Failed to delete task.');
          }
        }
      },
    ]);
  }

  // ── Collaborator search ──
  async function searchCollaborators(text: string) {
    setCollabSearch(text);
    if (text.trim().length < 2) { setCollabResults([]); return; }
    setSearchingCollab(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const results: { uid: string; displayName: string; email: string }[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (doc.id === user?.uid) return;
        if (collaborators.find(c => c.uid === doc.id)) return;
        const name = (d.displayName || d.username || '').toLowerCase();
        const email = (d.email || '').toLowerCase();
        if (name.includes(text.toLowerCase()) || email.includes(text.toLowerCase())) {
          results.push({ uid: doc.id, displayName: d.displayName || d.username || 'Unknown', email: d.email || '' });
        }
      });
      setCollabResults(results);
    } catch { } finally { setSearchingCollab(false); }
  }

  async function addCollaborator(c: { uid: string; displayName: string; email: string }) {
    const updated = [...collaborators, c];
    setCollaborators(updated);
    setCollabSearch('');
    setCollabResults([]);
    if (task.id && !task.isShared) {
      try {
        await updateTask(task.id, { collaborators: updated });
        await syncSharedTaskUpdates(task.id, { collaborators: updated });
        // Share task with new collaborator
        const ownerName = userProfile?.displayName || user?.displayName || 'A teammate';
        await shareTaskWithCollaborator({ ...task, collaborators: updated }, c, ownerName);
      } catch { }
    }
  }

  async function removeCollaborator(uid: string) {
    const updated = collaborators.filter(c => c.uid !== uid);
    setCollaborators(updated);
    if (task.id && !task.isShared) {
      try {
        await updateTask(task.id, { collaborators: updated });
        await syncSharedTaskUpdates(task.id, { collaborators: updated });
        await removeSharedTaskForUser(task.id, uid);
      } catch { }
    }
  }

  // ── Send message ──
  async function handleSendMessage() {
    if (!newMessage.trim() || !messageThreadId || !user) return;
    setSendingMsg(true);
    try {
      await addTaskMessage({
        taskId: messageThreadId,
        userId: user.uid,
        displayName: userProfile?.displayName || user?.displayName || 'Me',
        text: newMessage.trim(),
      });
      setNewMessage('');
    } catch {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  }

  function formatTime(ts: any) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <SafeAreaView style={td.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>

        {/* ── Header ── */}
        <View style={td.header}>
          <TouchableOpacity onPress={onClose} style={td.backBtn}>
            <Ionicons name="arrow-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <Text style={td.headerTitle} numberOfLines={1}>Task Details</Text>
          <View style={td.headerActions}>
            {!task.isShared && !editing && (
              <TouchableOpacity style={td.iconBtn} onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={20} color="#818CF8" />
              </TouchableOpacity>
            )}
            {!task.isShared && (
              <TouchableOpacity style={td.iconBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#EC4899" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={td.content} showsVerticalScrollIndicator={false}>

          {/* ── Task Info Card ── */}
          <View style={td.card}>
            {editing ? (
              <>
                <Text style={td.fieldLabel}>Title *</Text>
                <TextInput style={td.fieldInput} value={editTitle} onChangeText={setEditTitle} placeholderTextColor="#4B5563" />

                <Text style={td.fieldLabel}>Subject *</Text>
                <TextInput style={td.fieldInput} value={editSubject} onChangeText={setEditSubject} placeholderTextColor="#4B5563" />

                <Text style={td.fieldLabel}>Due Date</Text>
                <SimpleDatePicker value={editDue} minimumDate={new Date()} onChange={setEditDue} />

                <Text style={td.fieldLabel}>Time</Text>
                <SimpleTimePicker value={editTime} onChange={setEditTime} />

                <Text style={td.fieldLabel}>Priority</Text>
                <View style={td.priorityRow}>
                  {(['High', 'Medium', 'Low'] as Priority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[td.priorityBtn, editPriority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] }]}
                      onPress={() => setEditPriority(p)}>
                      <Text style={[td.priorityBtnText, editPriority === p && { color: PRIORITY_COLOR[p] }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={td.editActions}>
                  <TouchableOpacity style={td.cancelBtn} onPress={() => {
                    setEditing(false);
                    setEditTitle(task.title);
                    setEditSubject(task.subject);
                    setEditPriority(task.priority);
                  }}>
                    <Text style={td.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={td.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={td.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={td.taskTopRow}>
                  <View style={[td.priorityBadge, { backgroundColor: PRIORITY_COLOR[task.priority] + '22' }]}>
                    <Text style={[td.priorityBadgeText, { color: PRIORITY_COLOR[task.priority] }]}>{task.priority} Priority</Text>
                  </View>
                  <TouchableOpacity
                    style={[td.statusBadge, task.done && td.statusBadgeDone]}
                    onPress={handleToggleDone}>
                    <Ionicons name={task.done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={task.done ? '#10B981' : MUTED} />
                    <Text style={[td.statusText, task.done && { color: '#10B981' }]}>
                      {task.done ? 'Completed' : 'Mark Done'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {task.isShared && task.ownerName && (
                  <View style={td.sharedBadge}>
                    <Ionicons name="people-outline" size={13} color="#A78BFA" />
                    <Text style={td.sharedBadgeText}>Shared by {task.ownerName}</Text>
                  </View>
                )}

                <Text style={[td.taskTitle, task.done && td.taskTitleDone]}>{task.title}</Text>

                <View style={td.metaRow}>
                  <Ionicons name="book-outline" size={14} color={MUTED} />
                  <Text style={td.metaText}>{task.subject}</Text>
                </View>
                <View style={td.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={MUTED} />
                  <Text style={td.metaText}>Due {task.due}{task.time ? ` · ${task.time}` : ''}</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Collaborators ── */}
          <View style={td.section}>
            <View style={td.sectionHeader}>
              <Text style={td.sectionTitle}>Collaborators</Text>
              <TouchableOpacity style={td.addCollabBtn} onPress={() => setShowCollabModal(true)}>
                <Ionicons name="person-add-outline" size={14} color="#818CF8" />
                <Text style={td.addCollabText}>Add</Text>
              </TouchableOpacity>
            </View>
            {collaborators.length === 0 ? (
              <Text style={td.emptyText}>No collaborators yet.</Text>
            ) : collaborators.map(c => (
              <View key={c.uid} style={td.collabRow}>
                <View style={td.collabAvatar}>
                  <Text style={td.collabAvatarText}>{c.displayName.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={td.collabName}>{c.displayName}</Text>
                  <Text style={td.collabEmail}>{c.email}</Text>
                </View>
                <TouchableOpacity onPress={() => removeCollaborator(c.uid)}>
                  <Ionicons name="close-circle" size={18} color="#EC4899" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ── Messages ── */}
          <View style={td.section}>
            <Text style={td.sectionTitle}>Updates & Messages</Text>
            <ScrollView
              ref={scrollRef}
              style={td.messageBox}
              contentContainerStyle={{ gap: 10, padding: 12 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              {messages.length === 0 ? (
                <Text style={[td.emptyText, { textAlign: 'center', paddingVertical: 20 }]}>
                  No messages yet. Add an update below.
                </Text>
              ) : messages.map(msg => {
                const isMe = msg.userId === user?.uid;
                return (
                  <View key={msg.id} style={[td.msgBubbleWrap, isMe && td.msgBubbleWrapMe]}>
                    {!isMe && (
                      <View style={td.msgAvatar}>
                        <Text style={td.msgAvatarText}>{msg.displayName.slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={[td.msgBubble, isMe && td.msgBubbleMe]}>
                      {!isMe && <Text style={td.msgSender}>{msg.displayName}</Text>}
                      <Text style={[td.msgText, isMe && td.msgTextMe]}>{msg.text}</Text>
                      <Text style={[td.msgTime, isMe && { color: '#C7D2FE88' }]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

        </ScrollView>

        {/* ── Message Input ── */}
        <View style={td.inputBar}>
          <TextInput
            style={td.msgInput}
            placeholder="Write an update..."
            placeholderTextColor="#4B5563"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[td.sendBtn, (!newMessage.trim() || sendingMsg) && { opacity: 0.4 }]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendingMsg}>
            {sendingMsg
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Add Collaborator Modal ── */}
      <Modal visible={showCollabModal} transparent animationType="slide" onRequestClose={() => setShowCollabModal(false)}>
        <View style={td.modalOverlay}>
          <View style={td.modalSheet}>
            <View style={td.modalHeader}>
              <Text style={td.modalTitle}>Add Collaborator</Text>
              <TouchableOpacity onPress={() => { setShowCollabModal(false); setCollabSearch(''); setCollabResults([]); }}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={td.collabSearchBox}>
              <Ionicons name="search-outline" size={15} color={MUTED} />
              <TextInput
                style={td.collabSearchInput}
                placeholder="Search by name or email..."
                placeholderTextColor="#4B5563"
                value={collabSearch}
                onChangeText={searchCollaborators}
                autoFocus
              />
              {searchingCollab && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 2 }}>
              {collabResults.length === 0 && collabSearch.length >= 2 && !searchingCollab ? (
                <Text style={[td.emptyText, { textAlign: 'center', padding: 20 }]}>No users found.</Text>
              ) : collabResults.map(c => (
                <TouchableOpacity key={c.uid} style={td.collabResultRow} onPress={() => { addCollaborator(c); setShowCollabModal(false); }}>
                  <View style={td.collabAvatar}>
                    <Text style={td.collabAvatarText}>{c.displayName.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={td.collabName}>{c.displayName}</Text>
                    <Text style={td.collabEmail}>{c.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color="#818CF8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const td = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { flex: 1, color: TEXT, fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 16 },
  card: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12 },
  taskTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  priorityBadgeText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 10 },
  statusBadgeDone: { borderColor: '#10B98144', backgroundColor: '#10B98111' },
  statusText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  taskTitle: { color: TEXT, fontSize: 20, fontWeight: '800', lineHeight: 26 },
  taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: MUTED, fontSize: 13 },
  fieldLabel: { color: MUTED, fontSize: 12, fontWeight: '600' },
  fieldInput: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 11, color: TEXT, fontSize: 14 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 9, alignItems: 'center' },
  priorityBtnText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 10, backgroundColor: '#6366F1', paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
  addCollabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366F122', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  addCollabText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  emptyText: { color: MUTED, fontSize: 13 },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#A78BFA22', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start' },
  sharedBadgeText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  collabRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  collabAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  collabAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  collabName: { color: TEXT, fontSize: 13, fontWeight: '600' },
  collabEmail: { color: MUTED, fontSize: 11 },
  messageBox: { maxHeight: 260, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  msgBubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgBubbleWrapMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { color: TEXT, fontSize: 10, fontWeight: '700' },
  msgBubble: { maxWidth: '75%', backgroundColor: SURFACE, borderRadius: 14, borderBottomLeftRadius: 4, padding: 10, gap: 3, borderWidth: 1, borderColor: BORDER },
  msgBubbleMe: { backgroundColor: '#6366F1', borderRadius: 14, borderBottomRightRadius: 4, borderColor: '#6366F1' },
  msgSender: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
  msgText: { color: TEXT, fontSize: 13, lineHeight: 18 },
  msgTextMe: { color: '#fff' },
  msgTime: { color: MUTED, fontSize: 10, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE },
  msgInput: { flex: 1, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, color: TEXT, fontSize: 14, maxHeight: 90 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
  collabSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10 },
  collabSearchInput: { flex: 1, color: TEXT, fontSize: 14 },
  collabResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
});
