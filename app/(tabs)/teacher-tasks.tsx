import SimpleDatePicker from '@/components/SimpleDatePicker';
import SimpleTimePicker from '@/components/SimpleTimePicker';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/firebase/config';
import {
    AssignedTask,
    AssignedTaskSubmission,
    addAssignedTask,
    subscribeToTaskSubmissions,
    subscribeToTeacherAssignedTasks,
    uploadAssignmentFile,
} from '@/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Theme colors are now provided via useTheme() inside the component

type Priority = 'Low' | 'Medium' | 'High';

const PRIORITY_COLOR: Record<Priority, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#EC4899',
};

interface Student {
  id: string;
  displayName: string;
  email: string;
}

function buildDeadline(dateObj: Date, timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return dateObj.getTime();
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const d = new Date(dateObj);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export default function TeacherTasksScreen() {
  const { user, userProfile } = useFirebase();
  const { isDark, colors } = useTheme();
  const BG = colors.bg;
  const SURFACE = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const MUTED = colors.muted;

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [publishedTasks, setPublishedTasks] = useState<AssignedTask[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState('11:59 PM');
  const [priority, setPriority] = useState<Priority>('Medium');

  // Attachment state
  const [attachFile, setAttachFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Detail modal
  const [detailTask, setDetailTask] = useState<AssignedTask | null>(null);
  const [submissions, setSubmissions] = useState<AssignedTaskSubmission[]>([]);

  const initials = (userProfile?.displayName || user?.displayName || 'TR')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToTeacherAssignedTasks(user.uid, setPublishedTasks);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!detailTask?.id) { setSubmissions([]); return; }
    const unsub = subscribeToTaskSubmissions(detailTask.id, subs => setSubmissions(subs));
    return () => unsub();
  }, [detailTask?.id]);

  async function pickAttachment() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setAttachFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  }

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const list: Student[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        list.push({ id: doc.id, displayName: d.displayName || d.username || 'Unknown', email: d.email || '' });
      });
      setStudents(list);
    } catch {
    } finally {
      setLoadingStudents(false);
    }
  }

  async function handlePublish() {
    if (!title.trim() || !subject.trim()) {
      Alert.alert('Error', 'Please fill in Title and Class/Section.');
      return;
    }
    if (students.length === 0) {
      Alert.alert('No Students', 'There are no registered students to assign this task to.');
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    try {
      const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const deadlineTs = buildDeadline(dueDate, dueTime);
      // Upload teacher attachment first if provided
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      const tempId = `temp_${Date.now()}`;
      if (attachFile) {
        attachmentUrl = await uploadAssignmentFile(
          user!.uid, 'assignments', tempId,
          attachFile.uri, attachFile.name, attachFile.mimeType,
          pct => setUploadProgress(pct),
        );
        attachmentName = attachFile.name;
      }
      await addAssignedTask({
        teacherUid: user!.uid,
        teacherName: userProfile?.displayName || 'Teacher',
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        dueDate: dueDateStr,
        dueTime,
        dueDateTimestamp: deadlineTs,
        priority,
        assignedToUids: students.map(s => s.id),
        ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}),
      });
      setTitle(''); setDescription(''); setSubject('');
      setDueDate(new Date()); setDueTime('11:59 PM'); setPriority('Medium');
      setAttachFile(null); setUploadProgress(0);
      Alert.alert('Published!', `Assignment sent to ${students.length} student${students.length !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      Alert.alert('Error', `Failed to publish assignment.\n${e?.message || ''}`);
    } finally {
      setSaving(false);
    }
  }

  function timeAgo(ts: any) {
    if (!ts) return '';
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <SafeAreaView style={[tt.safe, { backgroundColor: BG }]} edges={['top']}>
      <ScrollView style={[tt.screen, { backgroundColor: BG }]} contentContainerStyle={tt.content} showsVerticalScrollIndicator={false}>

        <View style={tt.header}>
          <View>
            <Text style={[tt.title, { color: TEXT }]}>Assign Tasks</Text>
            <Text style={[tt.subtitle, { color: MUTED }]}>Create assignments for your students</Text>
          </View>
          <View style={[tt.avatar, { backgroundColor: '#8B5CF6' }]}>
            <Text style={tt.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Form card */}
        <View style={[tt.card, { backgroundColor: SURFACE, borderColor: BORDER }]}>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Assignment Title *</Text>
            <View style={[tt.inputRow, { backgroundColor: BG, borderColor: BORDER }]}>
              <Ionicons name="document-text-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
              <TextInput
                style={[tt.fieldInputInline, { color: TEXT }]}
                placeholder="e.g. Midterm Research Paper"
                placeholderTextColor={MUTED}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Instructions / Description</Text>
            <TextInput
              style={[tt.fieldInput, { height: 90, textAlignVertical: 'top', backgroundColor: BG, borderColor: BORDER, color: TEXT }]}
              placeholder="Write instructions for your students..."
              placeholderTextColor={MUTED}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Class / Section *</Text>
            <TextInput
              style={[tt.fieldInput, { backgroundColor: BG, borderColor: BORDER, color: TEXT }]}
              placeholder="e.g. CS-101"
              placeholderTextColor={MUTED}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Due Date *</Text>
            <SimpleDatePicker value={dueDate} minimumDate={new Date()} onChange={setDueDate} />
          </View>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Due Time *</Text>
            <SimpleTimePicker value={dueTime} onChange={setDueTime} />
          </View>

          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Priority Level</Text>
            <View style={tt.priorityRow}>
              {(['Low', 'Medium', 'High'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[tt.priorityBtn, { borderColor: BORDER }, priority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setPriority(p)}>
                  {priority === p && <Ionicons name="checkmark" size={12} color={PRIORITY_COLOR[p]} />}
                  <Text style={[tt.priorityBtnText, { color: MUTED }, priority === p && { color: PRIORITY_COLOR[p] }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Attachment picker */}
          <View>
            <Text style={[tt.fieldLabel, { color: MUTED }]}>Attach File (PDF, DOC, etc.)</Text>
            <TouchableOpacity style={[tt.attachBtn, { backgroundColor: BG, borderColor: BORDER }]} onPress={pickAttachment}>
              <Ionicons name={attachFile ? 'document' : 'attach-outline'} size={18} color={attachFile ? '#818CF8' : MUTED} />
              <Text style={[tt.attachBtnText, { color: MUTED }, attachFile && { color: '#818CF8' }]} numberOfLines={1}>
                {attachFile ? attachFile.name : 'Tap to attach a file…'}
              </Text>
              {attachFile && (
                <TouchableOpacity onPress={() => setAttachFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {saving && attachFile && uploadProgress > 0 && uploadProgress < 100 && (
              <View style={tt.progressBarWrap}>
                <View style={[tt.progressBarFill, { width: `${uploadProgress}%` as any }]} />
                <Text style={tt.progressText}>{uploadProgress}%</Text>
              </View>
            )}
          </View>

          {/* Students count */}
          <View style={tt.studentInfo}>
            <Ionicons name="people-outline" size={16} color="#818CF8" />
            {loadingStudents ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={[tt.studentInfoText, { color: MUTED }]}>
                Will be assigned to <Text style={{ color: '#818CF8', fontWeight: '700' }}>{students.length} student{students.length !== 1 ? 's' : ''}</Text>
              </Text>
            )}
          </View>

          <TouchableOpacity style={[tt.publishBtn, saving && { opacity: 0.6 }]} onPress={handlePublish} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="send-outline" size={14} color="#fff" />
                <Text style={tt.publishBtnText}>Publish Assignment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Published tasks list */}
        {publishedTasks.length > 0 && (
          <View style={tt.section}>
            <Text style={[tt.sectionTitle, { color: TEXT }]}>Published Assignments</Text>
            {publishedTasks.map(task => {
              const isPast = Date.now() > task.dueDateTimestamp;
              return (
                <TouchableOpacity key={task.id} style={[tt.publishedCard, { backgroundColor: SURFACE, borderColor: BORDER }]} activeOpacity={0.75} onPress={() => setDetailTask(task)}>
                  <View style={tt.publishedHeader}>
                    <Text style={[tt.publishedTitle, { color: TEXT }]} numberOfLines={1}>{task.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {isPast && <View style={tt.lockedBadge}><Ionicons name="lock-closed" size={10} color="#EF4444" /><Text style={tt.lockedBadgeText}>Closed</Text></View>}
                      <View style={[tt.priBadge, { backgroundColor: PRIORITY_COLOR[task.priority] + '22' }]}>
                        <Text style={[tt.priBadgeText, { color: PRIORITY_COLOR[task.priority] }]}>{task.priority}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[tt.publishedMeta, { color: MUTED }]}>{task.subject} · Due {task.dueDate} {task.dueTime}</Text>
                  {task.attachmentName && (
                    <View style={tt.attachChip}>
                      <Ionicons name="document-attach-outline" size={11} color="#818CF8" />
                      <Text style={tt.attachChipText} numberOfLines={1}>{task.attachmentName}</Text>
                    </View>
                  )}
                  <Text style={tt.publishedStudents}>Assigned to {task.assignedToUids.length} student{task.assignedToUids.length !== 1 ? 's' : ''} · Tap to view submissions</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Submission detail modal */}
      <Modal visible={!!detailTask} transparent animationType="slide" onRequestClose={() => setDetailTask(null)}>
        <View style={tt.overlay}>
          <View style={[tt.sheet, { backgroundColor: SURFACE }]}>
            {detailTask && (
              <>
                <View style={tt.sheetHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[tt.sheetTitle, { color: TEXT }]}>{detailTask.title}</Text>
                    <Text style={[tt.sheetMeta, { color: MUTED }]}>{detailTask.subject} · Due {detailTask.dueDate} {detailTask.dueTime}</Text>
                  </View>
                  <View style={[tt.priBadge, { backgroundColor: PRIORITY_COLOR[detailTask.priority] + '22' }]}>
                    <Text style={[tt.priBadgeText, { color: PRIORITY_COLOR[detailTask.priority] }]}>{detailTask.priority}</Text>
                  </View>
                </View>
                {detailTask.description ? (
                  <Text style={[tt.sheetDesc, { color: MUTED, borderTopColor: BORDER }]}>{detailTask.description}</Text>
                ) : null}
                {detailTask.attachmentUrl && (
                  <TouchableOpacity style={tt.sheetAttachBtn} onPress={() => Linking.openURL(detailTask.attachmentUrl!)}>
                    <Ionicons name="document-attach-outline" size={14} color="#818CF8" />
                    <Text style={tt.sheetAttachText} numberOfLines={1}>{detailTask.attachmentName || 'View Attachment'}</Text>
                    <Ionicons name="open-outline" size={13} color="#818CF8" />
                  </TouchableOpacity>
                )}
                <Text style={[tt.sheetSubsTitle, { color: TEXT, borderTopColor: BORDER }]}>Submissions ({submissions.length} / {detailTask.assignedToUids.length})</Text>
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  {submissions.length === 0 ? (
                    <Text style={[tt.emptyText, { color: MUTED }]}>No submissions yet.</Text>
                  ) : submissions.map((s, i) => (
                    <View key={i} style={[tt.subRow, { borderBottomColor: BORDER }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <View style={{ flex: 1 }}>
                        <Text style={[tt.subName, { color: TEXT }]}>{s.studentName}</Text>
                        <Text style={[tt.subTime, { color: MUTED }]}>{timeAgo(s.submittedAt)}</Text>
                        {s.fileName && (
                          <TouchableOpacity style={tt.subFileChip} onPress={() => s.fileUrl && Linking.openURL(s.fileUrl)}>
                            <Ionicons name="document-outline" size={11} color="#818CF8" />
                            <Text style={tt.subFileText} numberOfLines={1}>{s.fileName}</Text>
                            <Ionicons name="open-outline" size={11} color="#818CF8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[tt.closeBtn, { backgroundColor: BORDER }]} onPress={() => setDetailTask(null)}>
                  <Text style={[tt.closeBtnText, { color: TEXT }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const tt = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  fieldInputInline: { flex: 1, fontSize: 14 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1.5, paddingVertical: 9 },
  priorityBtnText: { fontSize: 13, fontWeight: '600' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366F111', borderRadius: 10, padding: 12 },
  studentInfoText: { fontSize: 13 },
  publishBtn: { borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  publishedCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  publishedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  publishedTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  publishedMeta: { fontSize: 12 },
  publishedStudents: { color: '#6366F1', fontSize: 11 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444422', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  lockedBadgeText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
  priBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  priBadgeText: { fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: '80%' },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetMeta: { fontSize: 12, marginTop: 2 },
  sheetDesc: { fontSize: 13, lineHeight: 19, borderTopWidth: 1, paddingTop: 10 },
  sheetSubsTitle: { fontSize: 14, fontWeight: '700', borderTopWidth: 1, paddingTop: 10 },
  emptyText: { fontSize: 13, paddingVertical: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  subName: { fontSize: 13, fontWeight: '600' },
  subTime: { fontSize: 11 },
  closeBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  closeBtnText: { fontSize: 14, fontWeight: '700' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 13 },
  attachBtnText: { flex: 1, fontSize: 13 },
  progressBarWrap: { marginTop: 8, backgroundColor: '#1E3A5F', borderRadius: 6, height: 6, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  progressBarFill: { height: 6, backgroundColor: '#6366F1', borderRadius: 6 },
  progressText: { position: 'absolute', right: 0, fontSize: 10 },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#818CF811', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  attachChipText: { color: '#818CF8', fontSize: 11, maxWidth: 200 },
  sheetAttachBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#818CF811', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#818CF833' },
  sheetAttachText: { flex: 1, color: '#818CF8', fontSize: 13, fontWeight: '600' },
  subFileChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#818CF811', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
  subFileText: { color: '#818CF8', fontSize: 11, maxWidth: 180 },
});
