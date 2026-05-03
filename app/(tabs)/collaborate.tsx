import SimpleDatePicker from '@/components/SimpleDatePicker';
import SimpleTimePicker from '@/components/SimpleTimePicker';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/firebase/config';
import {
    GroupChatMessage,
    GroupSharedTask,
    StudyGroup,
    addGroupSharedTask,
    addMemberToGroup,
    createStudyGroup,
    deleteGroupSharedTask,
    deleteStudyGroup,
    removeMemberFromGroup,
    sendGroupMessage,
    setGroupMemberAdmin,
    subscribeToGroupMessages,
    subscribeToGroupSharedTasks,
    subscribeToStudyGroups,
    toggleGroupSharedTaskDone,
    updateGroupSharedTask,
} from '@/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MEMBER_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#14B8A6'];
const PRIORITY_COLOR = { High: '#EC4899', Medium: '#F59E0B', Low: '#10B981' };

type Tab = 'tasks' | 'chat' | 'members';

function initials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function CollaborateScreen() {
  const { user, userProfile } = useFirebase();
  const { isDark } = useTheme();
  const BG = isDark ? '#0F172A' : '#F1F5F9';
  const SURFACE = isDark ? '#1E293B' : '#FFFFFF';
  const BORDER = isDark ? '#334155' : '#E2E8F0';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const MUTED = isDark ? '#94A3B8' : '#64748B';
  const col = useMemo(() => createCollabStyles(BG, SURFACE, BORDER, TEXT, MUTED), [isDark]);

  // ── List view state ──
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [createModal, setCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Teacher UIDs (to prevent removal) ──
  const [teacherUids, setTeacherUids] = useState<Set<string>>(new Set());

  // ── Member search ──
  const [memberSearchModal, setMemberSearchModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<{ uid: string; displayName: string; email: string }[]>([]);
  const [searchingMember, setSearchingMember] = useState(false);

  // ── Tasks ──
  const [groupTasks, setGroupTasks] = useState<GroupSharedTask[]>([]);
  const [taskModal, setTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskDue, setNewTaskDue] = useState(new Date());
  const [newTaskTime, setNewTaskTime] = useState('09:00 AM');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskAssignedUid, setNewTaskAssignedUid] = useState('');
  const [newTaskAssignedName, setNewTaskAssignedName] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // ── Task Detail ──
  const [detailTask, setDetailTask] = useState<GroupSharedTask | null>(null);
  const [detailAssignUid, setDetailAssignUid] = useState('');
  const [detailAssignName, setDetailAssignName] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  // ── Chat ──
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const chatRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStudyGroups(user.uid, setGroups);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))).then(snap => {
      setTeacherUids(new Set(snap.docs.map(d => d.id)));
    });
  }, []);

  // Keep activeGroup fresh whenever Firestore pushes updated group data
  useEffect(() => {
    if (!activeGroup?.id) return;
    const fresh = groups.find(g => g.id === activeGroup.id);
    if (fresh) setActiveGroup(fresh);
  }, [groups]);

  useEffect(() => {
    if (!activeGroup?.id) return;
    const u1 = subscribeToGroupSharedTasks(activeGroup.id, setGroupTasks);
    const u2 = subscribeToGroupMessages(activeGroup.id, setMessages);
    return () => { u1(); u2(); };
  }, [activeGroup?.id]);

  // ── Create group ──
  async function handleCreateGroup() {
    if (!groupName.trim() || !user) return;
    setCreating(true);
    try {
      const me = { uid: user.uid, displayName: user.displayName || 'Me', email: user.email || '' };
      await createStudyGroup({
        name: groupName.trim(),
        ownerUid: user.uid,
        ownerName: user.displayName || 'Me',
        memberUids: [user.uid],
        members: [me],
      });
      setGroupName('');
      setCreateModal(false);
    } catch { Alert.alert('Error', 'Failed to create group.'); }
    finally { setCreating(false); }
  }

  // ── Delete group ──
  function handleDeleteGroup(g: StudyGroup) {
    Alert.alert('Delete Group', `Delete "${g.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteStudyGroup(g.id!); } catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  }

  // ── Member search ──
  async function searchMembers(text: string) {
    setMemberQuery(text);
    if (text.trim().length < 2) { setMemberResults([]); return; }
    setSearchingMember(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const current = activeGroup?.memberUids || [];
      const res: { uid: string; displayName: string; email: string }[] = [];
      snap.forEach(d => {
        if (current.includes(d.id)) return;
        const data = d.data();
        const name = (data.displayName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        if (name.includes(text.toLowerCase()) || email.includes(text.toLowerCase())) {
          res.push({ uid: d.id, displayName: data.displayName || 'Unknown', email: data.email || '' });
        }
      });
      setMemberResults(res);
    } catch {} finally { setSearchingMember(false); }
  }

  async function handleAddMember(member: { uid: string; displayName: string; email: string }) {
    if (!activeGroup?.id) return;
    try {
      await addMemberToGroup(activeGroup.id, member, activeGroup.memberUids, activeGroup.members);
      setMemberQuery('');
      setMemberResults([]);
      setMemberSearchModal(false);
    } catch { Alert.alert('Error', 'Failed to add member.'); }
  }

  async function handleToggleAdmin(member: { uid: string; displayName: string; email: string }) {
    if (!activeGroup?.id) return;
    const currentAdminUids = activeGroup.adminUids || [];
    const isCurrentlyAdmin = currentAdminUids.includes(member.uid);
    const action = isCurrentlyAdmin ? 'Remove admin from' : 'Make admin';
    Alert.alert(
      `${action} ${member.displayName}?`,
      isCurrentlyAdmin
        ? 'They will lose admin privileges but remain a member.'
        : 'They can delete tasks but cannot remove members or delete the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isCurrentlyAdmin ? 'Remove Admin' : 'Make Admin', onPress: async () => {
          try { await setGroupMemberAdmin(activeGroup.id!, member.uid, !isCurrentlyAdmin, currentAdminUids); }
          catch { Alert.alert('Error', 'Failed to update admin status.'); }
        }},
      ]
    );
  }

  function handleRemoveMember(member: { uid: string; displayName: string; email: string }, isTeacher: boolean) {
    if (!activeGroup?.id) return;
    if (member.uid === activeGroup.ownerUid) { Alert.alert('Cannot remove the group owner.'); return; }
    if (isTeacher) { Alert.alert('Cannot remove the teacher from the group.'); return; }
    Alert.alert('Remove Member', `Remove ${member.displayName} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const newAdminUids = (activeGroup.adminUids || []).filter(id => id !== member.uid);
          await removeMemberFromGroup(activeGroup.id!, member.uid, activeGroup.memberUids, activeGroup.members);
          if (newAdminUids.length !== (activeGroup.adminUids || []).length) {
            await setGroupMemberAdmin(activeGroup.id!, member.uid, false, activeGroup.adminUids || []);
          }
        } catch { Alert.alert('Error', 'Failed to remove member.'); }
      }},
    ]);
  }

  // ── Reassign task ──
  async function handleReassign() {
    if (!detailTask?.id) return;
    setSavingDetail(true);
    try {
      await updateGroupSharedTask(detailTask.id!, {
        assignedTo: detailAssignUid || undefined,
        assignedToName: detailAssignName || undefined,
      });
      setDetailTask(prev => prev ? { ...prev, assignedTo: detailAssignUid, assignedToName: detailAssignName } : prev);
    } catch { Alert.alert('Error', 'Failed to update assignment.'); }
    finally { setSavingDetail(false); }
  }

  function openDetail(task: GroupSharedTask) {
    setDetailTask(task);
    setDetailAssignUid(task.assignedTo || '');
    setDetailAssignName(task.assignedToName || '');
  }

  // ── Add task ──
  async function handleAddTask() {
    if (!newTaskTitle.trim() || !newTaskSubject.trim()) {
      Alert.alert('Error', 'Title and Subject are required.');
      return;
    }
    if (!activeGroup?.id || !user) return;
    setSavingTask(true);
    try {
      const dueStr = newTaskDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await addGroupSharedTask({
        groupId: activeGroup.id,
        title: newTaskTitle.trim(),
        subject: newTaskSubject.trim(),
        due: dueStr,
        time: newTaskTime,
        priority: newTaskPriority,
        assignedTo: newTaskAssignedUid || undefined,
        assignedToName: newTaskAssignedName || undefined,
        done: false,
        createdByUid: user.uid,
        createdByName: user.displayName || 'Me',
      });
      setNewTaskTitle(''); setNewTaskSubject(''); setNewTaskDue(new Date());
      setNewTaskTime('09:00 AM'); setNewTaskPriority('Medium');
      setNewTaskAssignedUid(''); setNewTaskAssignedName('');
      setTaskModal(false);
    } catch { Alert.alert('Error', 'Failed to add task.'); }
    finally { setSavingTask(false); }
  }

  // ── Send chat ──
  async function handleSend() {
    if (!chatText.trim() || !activeGroup?.id || !user) return;
    const text = chatText.trim();
    setChatText('');
    try {
      await sendGroupMessage({
        groupId: activeGroup.id,
        userId: user.uid,
        displayName: user.displayName || 'Me',
        text,
      });
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { Alert.alert('Error', 'Failed to send message.'); }
  }

  const isOwner = activeGroup?.ownerUid === user?.uid;
  const isAdmin = (activeGroup?.adminUids || []).includes(user?.uid || '');
  const canManageTasks = isOwner || isAdmin;
  const completion = groupTasks.length === 0 ? 0 : Math.round((groupTasks.filter(t => t.done).length / groupTasks.length) * 100);

  if (activeGroup) {
    return (
      <SafeAreaView style={col.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={col.groupHeader}>
            <TouchableOpacity onPress={() => { setActiveGroup(null); setActiveTab('tasks'); }} style={col.backBtn}>
              <Ionicons name="arrow-back" size={20} color={TEXT} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={col.groupTag}>Group Collaboration</Text>
              <Text style={col.groupName} numberOfLines={1}>{activeGroup.name}</Text>
            </View>
            {isOwner && (
              <TouchableOpacity style={col.deleteGroupBtn} onPress={() => handleDeleteGroup(activeGroup)}>
                <Ionicons name="trash-outline" size={16} color="#EC4899" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={col.tabBar}>
            {(['tasks', 'chat', 'members'] as Tab[]).map(t => (
              <TouchableOpacity key={t} style={[col.tabBtn, activeTab === t && col.tabBtnActive]} onPress={() => setActiveTab(t)}>
                <Text style={[col.tabText, activeTab === t && col.tabTextActive]}>
                  {t === 'tasks' ? '✅ Tasks' : t === 'chat' ? '💬 Chat' : '👥 Members'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <ScrollView style={col.screen} contentContainerStyle={col.content} showsVerticalScrollIndicator={false}>
              {/* Progress */}
              <View style={col.panel}>
                <View style={col.panelHeader}>
                  <Text style={col.panelTitle}>Completion</Text>
                  <Text style={col.completionPct}>{completion}%</Text>
                </View>
                <View style={col.progressBg}>
                  <View style={[col.progressFill, { width: `${completion}%` as any }]} />
                </View>
              </View>

              {/* Tasks */}
              <View style={col.panel}>
                <View style={col.panelHeader}>
                  <Text style={col.panelTitle}>Tasks ({groupTasks.length})</Text>
                  <TouchableOpacity onPress={() => setTaskModal(true)}>
                    <Ionicons name="add-circle-outline" size={22} color="#818CF8" />
                  </TouchableOpacity>
                </View>
                {groupTasks.length === 0 ? (
                  <Text style={col.emptyText}>No tasks yet. Tap + to add one.</Text>
                ) : groupTasks.map(task => (
                  <View key={task.id} style={col.taskRow}>
                    <TouchableOpacity onPress={() => toggleGroupSharedTaskDone(task.id!, !task.done)}>
                      <View style={[col.taskCheck, task.done && col.taskCheckDone]}>
                        {task.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={col.taskLeft} onPress={() => openDetail(task)} activeOpacity={0.7}>
                      <Text style={[col.taskTitle, task.done && col.taskTitleDone]}>{task.title}</Text>
                      <Text style={col.taskAssigned}>
                        {task.subject}{task.assignedToName ? ` · @${task.assignedToName}` : ' · Unassigned'}
                      </Text>
                      <Text style={col.taskDue}>{task.due}{task.time ? ` · ${task.time}` : ''}</Text>
                      <Text style={col.taskDetailHint}>Tap to view details</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[col.priorityBadge, { backgroundColor: PRIORITY_COLOR[task.priority] + '22' }]}>
                        <Text style={[col.priorityText, { color: PRIORITY_COLOR[task.priority] }]}>{task.priority}</Text>
                      </View>
                      {canManageTasks && (
                        <TouchableOpacity onPress={() => deleteGroupSharedTask(task.id!)}>
                          <Ionicons name="trash-outline" size={14} color="#EC4899" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === 'chat' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={chatRef}
                style={col.chatScroll}
                contentContainerStyle={col.chatContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}>
                {messages.length === 0 ? (
                  <Text style={[col.emptyText, { textAlign: 'center', marginTop: 40 }]}>No messages yet. Say hi!</Text>
                ) : messages.map(msg => {
                  const isMe = msg.userId === user?.uid;
                  return (
                    <View key={msg.id} style={[col.bubbleWrap, isMe && col.bubbleWrapMe]}>
                      {!isMe && (
                        <View style={[col.msgAvatar, { backgroundColor: MEMBER_COLORS[msg.displayName.charCodeAt(0) % MEMBER_COLORS.length] }]}>
                          <Text style={col.msgAvatarText}>{initials(msg.displayName)}</Text>
                        </View>
                      )}
                      <View style={{ maxWidth: '75%' }}>
                        {!isMe && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={col.msgSender}>{msg.displayName}</Text>
                    {(activeGroup?.adminUids || []).includes(msg.userId) && (
                      <View style={col.chatAdminBadge}><Text style={col.chatAdminBadgeText}>Admin</Text></View>
                    )}
                    {msg.userId === activeGroup?.ownerUid && (
                      <View style={col.chatOwnerBadge}><Text style={col.chatOwnerBadgeText}>Owner</Text></View>
                    )}
                  </View>
                )}
                        <View style={[col.bubble, isMe && col.bubbleMe]}>
                          <Text style={[col.bubbleText, isMe && col.bubbleTextMe]}>{msg.text}</Text>
                        </View>
                        <Text style={[col.msgTime, isMe && { textAlign: 'right' }]}>
                          {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={col.chatBar}>
                <TextInput
                  style={col.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#4B5563"
                  value={chatText}
                  onChangeText={setChatText}
                  multiline
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={col.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── MEMBERS TAB ── */}
          {activeTab === 'members' && (
            <ScrollView style={col.screen} contentContainerStyle={col.content} showsVerticalScrollIndicator={false}>
              <View style={col.panel}>
                <View style={col.panelHeader}>
                  <Text style={col.panelTitle}>Members ({activeGroup.members.length})</Text>
                  {isOwner && (
                    <TouchableOpacity style={col.addMemberBtn} onPress={() => setMemberSearchModal(true)}>
                      <Ionicons name="person-add-outline" size={14} color="#fff" />
                      <Text style={col.addMemberBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {activeGroup.members.map((m, idx) => {
                  const memberIsOwner = m.uid === activeGroup.ownerUid;
                  const memberIsAdmin = (activeGroup.adminUids || []).includes(m.uid);
                  const memberIsTeacher = teacherUids.has(m.uid);
                  return (
                  <View key={m.uid} style={col.memberListRow}>
                    <View style={[col.memberAvatar, { backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }]}>
                      <Text style={col.memberInitials}>{initials(m.displayName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={col.memberName}>{m.displayName}</Text>
                      <Text style={col.memberEmail}>{m.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {memberIsOwner && <View style={col.ownerBadge}><Text style={col.ownerBadgeText}>Owner</Text></View>}
                      {!memberIsOwner && memberIsAdmin && <View style={col.adminBadge}><Text style={col.adminBadgeText}>Admin</Text></View>}
                      {isOwner && !memberIsOwner && (
                        <TouchableOpacity onPress={() => handleToggleAdmin(m)} style={col.adminToggleBtn}>
                          <Ionicons name={memberIsAdmin ? 'shield' : 'shield-outline'} size={16} color={memberIsAdmin ? '#F59E0B' : '#475569'} />
                        </TouchableOpacity>
                      )}
                      {isOwner && !memberIsOwner && !memberIsTeacher && (
                        <TouchableOpacity onPress={() => handleRemoveMember(m, false)}>
                          <Ionicons name="remove-circle-outline" size={20} color="#EC4899" />
                        </TouchableOpacity>
                      )}
                      {memberIsTeacher && (
                        <View style={col.adminBadge}><Text style={col.adminBadgeText}>Teacher</Text></View>
                      )}
                    </View>
                  </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* FAB: only on tasks tab */}
          {activeTab === 'tasks' && (
            <TouchableOpacity style={col.fab} onPress={() => setTaskModal(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={col.fabText}>New Task</Text>
            </TouchableOpacity>
          )}

        </KeyboardAvoidingView>

        {/* Add Task Modal */}
        <Modal visible={taskModal} transparent animationType="slide" onRequestClose={() => setTaskModal(false)}>
          <View style={col.overlay}>
            <ScrollView style={col.sheetScroll} contentContainerStyle={col.sheet} showsVerticalScrollIndicator={false}>
              <Text style={col.sheetTitle}>New Group Task</Text>
              <Text style={col.fieldLabel}>Title *</Text>
              <TextInput style={col.fieldInput} placeholder="e.g. Literature Review" placeholderTextColor="#4B5563" value={newTaskTitle} onChangeText={setNewTaskTitle} />
              <Text style={col.fieldLabel}>Subject *</Text>
              <TextInput style={col.fieldInput} placeholder="e.g. Psychology" placeholderTextColor="#4B5563" value={newTaskSubject} onChangeText={setNewTaskSubject} />
              <Text style={col.fieldLabel}>Due Date *</Text>
              <SimpleDatePicker value={newTaskDue} minimumDate={new Date()} onChange={setNewTaskDue} />
              <Text style={col.fieldLabel}>Time</Text>
              <SimpleTimePicker value={newTaskTime} onChange={setNewTaskTime} />
              <Text style={col.fieldLabel}>Priority</Text>
              <View style={col.priorityRow}>
                {(['High', 'Medium', 'Low'] as const).map(p => (
                  <TouchableOpacity key={p} style={[col.priorityBtn, newTaskPriority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] }]} onPress={() => setNewTaskPriority(p)}>
                    <Text style={[col.priorityBtnText, newTaskPriority === p && { color: PRIORITY_COLOR[p] }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={col.fieldLabel}>Assign To (optional)</Text>
              <View style={col.assignRow}>
                <TouchableOpacity style={[col.assignChip, !newTaskAssignedUid && col.assignChipActive]} onPress={() => { setNewTaskAssignedUid(''); setNewTaskAssignedName(''); }}>
                  <Text style={col.assignChipText}>Unassigned</Text>
                </TouchableOpacity>
                {activeGroup.members.map((m, idx) => (
                  <TouchableOpacity key={m.uid} style={[col.assignChip, newTaskAssignedUid === m.uid && col.assignChipActive]} onPress={() => { setNewTaskAssignedUid(m.uid); setNewTaskAssignedName(m.displayName); }}>
                    <View style={[col.assignAvatar, { backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }]}>
                      <Text style={col.assignAvatarText}>{initials(m.displayName)}</Text>
                    </View>
                    <Text style={col.assignChipText}>{m.displayName.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={col.sheetActions}>
                <TouchableOpacity style={col.cancelBtn} onPress={() => setTaskModal(false)}>
                  <Text style={col.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[col.saveBtn, savingTask && { opacity: 0.6 }]} onPress={handleAddTask} disabled={savingTask}>
                  <Text style={col.saveBtnText}>{savingTask ? 'Saving...' : 'Add Task'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Add Member Modal */}
        <Modal visible={memberSearchModal} transparent animationType="slide" onRequestClose={() => setMemberSearchModal(false)}>
          <View style={col.overlay}>
            <View style={col.sheet}>
              <Text style={col.sheetTitle}>Add Member</Text>
              <View style={col.memberSearchBox}>
                <Ionicons name="search-outline" size={14} color={MUTED} />
                <TextInput
                  style={col.memberSearchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor="#4B5563"
                  value={memberQuery}
                  onChangeText={searchMembers}
                  autoFocus
                />
                {searchingMember && <ActivityIndicator size="small" color="#6366F1" />}
              </View>
              {memberResults.length === 0 && memberQuery.length >= 2 && !searchingMember && (
                <Text style={col.emptyText}>No users found.</Text>
              )}
              {memberResults.map(m => (
                <TouchableOpacity key={m.uid} style={col.memberResultRow} onPress={() => handleAddMember(m)}>
                  <View style={[col.memberAvatar, { backgroundColor: '#6366F1' }]}>
                    <Text style={col.memberInitials}>{initials(m.displayName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={col.memberName}>{m.displayName}</Text>
                    <Text style={col.memberEmail}>{m.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color="#818CF8" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[col.cancelBtn, { marginTop: 8 }]} onPress={() => { setMemberSearchModal(false); setMemberQuery(''); setMemberResults([]); }}>
                <Text style={col.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Task Detail Modal */}
        <Modal visible={!!detailTask} transparent animationType="slide" onRequestClose={() => setDetailTask(null)}>
          <View style={col.overlay}>
            <ScrollView style={col.sheetScroll} contentContainerStyle={col.sheet} showsVerticalScrollIndicator={false}>
              {detailTask && (
                <>
                  <View style={col.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={col.detailTitle}>{detailTask.title}</Text>
                      <Text style={col.detailSubject}>{detailTask.subject}</Text>
                    </View>
                    <View style={[col.priorityBadge, { backgroundColor: PRIORITY_COLOR[detailTask.priority] + '22' }]}>
                      <Text style={[col.priorityText, { color: PRIORITY_COLOR[detailTask.priority] }]}>{detailTask.priority}</Text>
                    </View>
                  </View>

                  {/* Info rows */}
                  <View style={col.detailInfoBox}>
                    <View style={col.detailInfoRow}>
                      <Ionicons name="calendar-outline" size={14} color={MUTED} />
                      <Text style={col.detailInfoText}>Due: {detailTask.due}</Text>
                    </View>
                    {detailTask.time ? (
                      <View style={col.detailInfoRow}>
                        <Ionicons name="time-outline" size={14} color={MUTED} />
                        <Text style={col.detailInfoText}>Time: {detailTask.time}</Text>
                      </View>
                    ) : null}
                    <View style={col.detailInfoRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={detailTask.done ? '#10B981' : MUTED} />
                      <Text style={col.detailInfoText}>Status: {detailTask.done ? 'Completed' : 'Pending'}</Text>
                    </View>
                    <View style={col.detailInfoRow}>
                      <Ionicons name="person-outline" size={14} color={MUTED} />
                      <Text style={col.detailInfoText}>Created by: {detailTask.createdByName}</Text>
                    </View>
                  </View>

                  {/* Assign To */}
                  <Text style={col.fieldLabel}>Assign To</Text>
                  <View style={col.assignRow}>
                    <TouchableOpacity
                      style={[col.assignChip, !detailAssignUid && col.assignChipActive]}
                      onPress={() => { setDetailAssignUid(''); setDetailAssignName(''); }}>
                      <Text style={col.assignChipText}>Unassigned</Text>
                    </TouchableOpacity>
                    {activeGroup?.members.map((m, idx) => (
                      <TouchableOpacity
                        key={m.uid}
                        style={[col.assignChip, detailAssignUid === m.uid && col.assignChipActive]}
                        onPress={() => { setDetailAssignUid(m.uid); setDetailAssignName(m.displayName); }}>
                        <View style={[col.assignAvatar, { backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }]}>
                          <Text style={col.assignAvatarText}>{initials(m.displayName)}</Text>
                        </View>
                        <Text style={col.assignChipText}>{m.displayName.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={col.sheetActions}>
                    <TouchableOpacity style={col.cancelBtn} onPress={() => setDetailTask(null)}>
                      <Text style={col.cancelBtnText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[col.saveBtn, savingDetail && { opacity: 0.6 }]}
                      onPress={handleReassign}
                      disabled={savingDetail}>
                      <Text style={col.saveBtnText}>{savingDetail ? 'Saving...' : 'Save Assignment'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={col.safe} edges={['top']}>
      <ScrollView style={col.screen} contentContainerStyle={col.content} showsVerticalScrollIndicator={false}>
        <View style={col.header}>
          <Text style={col.title}>Collaborate</Text>
          <Pressable style={col.avatar}>
            <Text style={col.avatarText}>{initials(user?.displayName || 'U')}</Text>
          </Pressable>
        </View>

        {groups.length === 0 ? (
          <View style={col.emptyBox}>
            <Ionicons name="people-outline" size={48} color={MUTED} />
            <Text style={col.emptyTitle}>No groups yet</Text>
            <Text style={col.emptySubtitle}>Create a study group to collaborate with classmates.</Text>
            <TouchableOpacity style={col.createBtn} onPress={() => setCreateModal(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={col.createBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : groups.map((g, gi) => (
          <TouchableOpacity key={g.id} style={col.groupCard} onPress={() => { setActiveGroup(g); setActiveTab('tasks'); }} activeOpacity={0.75}>
            <View style={col.groupCardHeader}>
              <Text style={col.groupCardName}>{g.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {g.ownerUid === user?.uid && (
                  <View style={col.ownerBadge}><Text style={col.ownerBadgeText}>Owner</Text></View>
                )}
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </View>
            </View>
            <View style={col.groupCardMeta}>
              <View style={{ flexDirection: 'row' }}>
                {g.members.slice(0, 4).map((m, idx) => (
                  <View key={m.uid} style={[col.memberAvatarSm, { backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length], marginLeft: idx > 0 ? -8 : 0 }]}>
                    <Text style={col.memberInitialsSm}>{initials(m.displayName)}</Text>
                  </View>
                ))}
              </View>
              <Text style={col.groupCardSub}>{g.members.length} member{g.members.length !== 1 ? 's' : ''}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={col.fab} onPress={() => setCreateModal(true)}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={col.fabText}>New Group</Text>
      </TouchableOpacity>

      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <View style={col.overlay}>
          <View style={col.sheet}>
            <Text style={col.sheetTitle}>Create Study Group</Text>
            <Text style={col.fieldLabel}>Group Name *</Text>
            <TextInput style={col.fieldInput} placeholder="e.g. Psychology Research Paper" placeholderTextColor="#4B5563" value={groupName} onChangeText={setGroupName} />
            <View style={col.sheetActions}>
              <TouchableOpacity style={col.cancelBtn} onPress={() => setCreateModal(false)}>
                <Text style={col.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[col.saveBtn, creating && { opacity: 0.6 }]} onPress={handleCreateGroup} disabled={creating}>
                <Text style={col.saveBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createCollabStyles(BG: string, SURFACE: string, BORDER: string, TEXT: string, MUTED: string) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    screen: { flex: 1, backgroundColor: BG },
    content: { padding: 16, gap: 16, paddingBottom: 100 },
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
    title: { color: TEXT, fontSize: 22, fontWeight: '800' },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    // Group list
    emptyBox: { alignItems: 'center', gap: 12, paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
    emptySubtitle: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    emptyText: { color: MUTED, fontSize: 13, paddingVertical: 10 },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    groupCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12, marginHorizontal: 16 },
    groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupCardName: { color: TEXT, fontSize: 16, fontWeight: '700', flex: 1 },
    groupCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    groupCardSub: { color: MUTED, fontSize: 12 },
    memberAvatarSm: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: SURFACE },
    memberInitialsSm: { color: '#fff', fontSize: 10, fontWeight: '700' },
    // Group detail header
    groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 0, gap: 4 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
    groupTag: { color: MUTED, fontSize: 11, fontWeight: '600' },
    groupName: { color: TEXT, fontSize: 18, fontWeight: '800' },
    deleteGroupBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EC489911', borderWidth: 1, borderColor: '#EC489933', justifyContent: 'center', alignItems: 'center' },
    // Tabs
    tabBar: { flexDirection: 'row', margin: 14, marginBottom: 0, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 4, gap: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    tabBtnActive: { backgroundColor: '#6366F1' },
    tabText: { color: MUTED, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    // Panel
    panel: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12 },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
    completionPct: { color: '#818CF8', fontSize: 16, fontWeight: '800' },
    progressBg: { height: 8, backgroundColor: BG, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
    progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
    // Tasks
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
    taskCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
    taskCheckDone: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    taskLeft: { flex: 1, gap: 2 },
    taskTitle: { color: TEXT, fontSize: 14, fontWeight: '600' },
    taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
    taskAssigned: { color: MUTED, fontSize: 12 },
    taskDue: { color: MUTED, fontSize: 11 },
    priorityBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    priorityText: { fontSize: 11, fontWeight: '700' },
    // Assign chips in task modal
    assignRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    assignChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: BG },
    assignChipActive: { borderColor: '#6366F1', backgroundColor: '#6366F122' },
    assignChipText: { color: TEXT, fontSize: 12, fontWeight: '600' },
    assignAvatar: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    assignAvatarText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    // Members tab
    memberListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    memberInitials: { color: '#fff', fontSize: 12, fontWeight: '700' },
    memberName: { color: TEXT, fontSize: 14, fontWeight: '600' },
    memberEmail: { color: MUTED, fontSize: 11 },
    ownerBadge: { backgroundColor: '#6366F122', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    ownerBadgeText: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
    adminBadge: { backgroundColor: '#F59E0B22', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    adminBadgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
    adminToggleBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    chatAdminBadge: { backgroundColor: '#F59E0B22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    chatAdminBadgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '700' },
    chatOwnerBadge: { backgroundColor: '#6366F122', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    chatOwnerBadgeText: { color: '#818CF8', fontSize: 9, fontWeight: '700' },
    addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    addMemberBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    memberSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10 },
    memberSearchInput: { flex: 1, color: TEXT, fontSize: 13 },
    memberResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
    // Chat
    chatScroll: { flex: 1, backgroundColor: BG },
    chatContent: { padding: 16, gap: 12, paddingBottom: 8 },
    bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    bubbleWrapMe: { flexDirection: 'row-reverse' },
    msgAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    msgAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    msgSender: { color: MUTED, fontSize: 11, marginBottom: 2, marginLeft: 2 },
    bubble: { backgroundColor: SURFACE, borderRadius: 16, borderBottomLeftRadius: 4, padding: 10, borderWidth: 1, borderColor: BORDER },
    bubbleMe: { backgroundColor: '#6366F1', borderBottomLeftRadius: 16, borderBottomRightRadius: 4, borderColor: '#6366F1' },
    bubbleText: { color: TEXT, fontSize: 14 },
    bubbleTextMe: { color: '#fff' },
    msgTime: { color: MUTED, fontSize: 10, marginTop: 2, marginLeft: 2 },
    chatBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE },
    chatInput: { flex: 1, backgroundColor: BG, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, color: TEXT, fontSize: 14, maxHeight: 100 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    // FAB
    fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, elevation: 4 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    // Modal
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheetScroll: { maxHeight: '90%' },
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
    // Task detail
    taskDetailHint: { color: '#6366F1', fontSize: 10, marginTop: 2 },
    detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
    detailTitle: { color: TEXT, fontSize: 18, fontWeight: '800' },
    detailSubject: { color: MUTED, fontSize: 13, marginTop: 2 },
    detailInfoBox: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 10 },
    detailInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailInfoText: { color: TEXT, fontSize: 13 },
  });
}
