import SimpleTimePicker from '@/components/SimpleTimePicker';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GroupSharedTask, Schedule, Task, addScheduleItem, deleteScheduleItem, subscribeToAllSchedule, subscribeToGroupSharedTasks, subscribeToStudyGroups, subscribeToTasks } from '@/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SAMPLE_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDueDate(due: string): Date | null {
  if (!due) return null;
  // Handle "May 1, 2026" or "May 01, 2026"
  const match = due.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match) {
    const month = MONTH_MAP[match[1]];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month !== undefined) return new Date(year, month, day);
  }
  // Fallback: ISO or other parseable formats
  const d = new Date(due);
  return isNaN(d.getTime()) ? null : d;
}

export default function ScheduleScreen() {
  const { user } = useFirebase();
  const { isDark } = useTheme();
  const BG = isDark ? '#0F172A' : '#F1F5F9';
  const SURFACE = isDark ? '#1E293B' : '#FFFFFF';
  const BORDER = isDark ? '#334155' : '#E2E8F0';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const MUTED = isDark ? '#94A3B8' : '#64748B';
  const sc = useMemo(() => createScheduleStyles(BG, SURFACE, BORDER, TEXT, MUTED), [isDark]);
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupTasks, setGroupTasks] = useState<GroupSharedTask[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newColor, setNewColor] = useState(SAMPLE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToAllSchedule(user.uid, setSchedules);
    const u2 = subscribeToTasks(user.uid, setTasks);
    // Subscribe to all group tasks across all groups user belongs to
    let groupUnsubs: (() => void)[] = [];
    const u3 = subscribeToStudyGroups(user.uid, (groups) => {
      groupUnsubs.forEach(u => u());
      const allGroupTasks: GroupSharedTask[] = [];
      let remaining = groups.length;
      if (remaining === 0) { setGroupTasks([]); return; }
      groupUnsubs = groups.map(g =>
        subscribeToGroupSharedTasks(g.id!, (tasks) => {
          // Merge: replace existing tasks for this group, keep others
          setGroupTasks(prev => [
            ...prev.filter(t => t.groupId !== g.id),
            ...tasks,
          ]);
        })
      );
    });
    return () => { u1(); u2(); u3(); groupUnsubs.forEach(u => u()); };
  }, [user]);

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (calCells.length % 7 !== 0) calCells.push(null);

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function getTasksForDate(day: number) {
    const cellDate = new Date(viewYear, viewMonth, day);
    return tasks.filter(t => {
      const d = parseDueDate(t.due);
      return d && isSameDay(d, cellDate);
    });
  }

  function getGroupTasksForDate(day: number) {
    const cellDate = new Date(viewYear, viewMonth, day);
    return groupTasks.filter(t => {
      const d = parseDueDate(t.due);
      return d && isSameDay(d, cellDate);
    });
  }

  function getClassesForDate(day: number) {
    const cellDate = new Date(viewYear, viewMonth, day);
    const dow = cellDate.getDay(); // 0=Sun..6=Sat
    return schedules.filter(s => s.dayOfWeek === dow);
  }

  const selectedTasks = tasks.filter(t => {
    const d = parseDueDate(t.due);
    return d && isSameDay(d, selectedDate);
  });
  const selectedGroupTasks = groupTasks.filter(t => {
    const d = parseDueDate(t.due);
    return d && isSameDay(d, selectedDate);
  });
  const selectedClasses = schedules
    .filter(s => s.dayOfWeek === selectedDate.getDay())
    .sort((a, b) => a.time.localeCompare(b.time));

  async function handleAddClass() {
    if (!newSubject.trim() || !newRoom.trim() || !newTime.trim()) {
      Alert.alert('Error', 'Please fill in Subject, Room and Start Time.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await addScheduleItem({
        userId: user.uid,
        subject: newSubject.trim(),
        room: newRoom.trim(),
        time: newTime.trim(),
        color: newColor,
        dayOfWeek: selectedDate.getDay(),
      });
      setNewSubject(''); setNewRoom(''); setNewTime(''); setNewEndTime('');
      setNewColor(SAMPLE_COLORS[0]);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass(id: string) {
    Alert.alert('Delete Class', 'Remove this class from your schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteScheduleItem(id); } catch { Alert.alert('Error', 'Failed to delete.'); }
      }}
    ]);
  }

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <ScrollView style={sc.screen} contentContainerStyle={sc.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={sc.header}>
          <Text style={sc.title}>Class Schedule</Text>
          <Pressable style={sc.avatar}>
            <Text style={sc.avatarText}>{user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}</Text>
          </Pressable>
        </View>

        {/* Full Month Calendar */}
        <View style={sc.calCard}>
          {/* Month nav */}
          <View style={sc.monthNav}>
            <TouchableOpacity style={sc.navBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={18} color={TEXT} />
            </TouchableOpacity>
            <Text style={sc.monthText}>{monthName}</Text>
            <TouchableOpacity style={sc.navBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={18} color={TEXT} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week header */}
          <View style={sc.gridRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={sc.gridDayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {Array.from({ length: calCells.length / 7 }, (_, row) => (
            <View key={row} style={sc.gridRow}>
              {calCells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={sc.gridCell} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const isToday = isSameDay(cellDate, today);
                const isSelected = isSameDay(cellDate, selectedDate);
                const dayTasks = getTasksForDate(day);
                const dayClasses = getClassesForDate(day);
                const dayGroupTasks = getGroupTasksForDate(day);
                const hasTasks = dayTasks.length > 0;
                const hasClasses = dayClasses.length > 0;
                const hasGroupTasks = dayGroupTasks.length > 0;
                return (
                  <TouchableOpacity
                    key={col}
                    style={[sc.gridCell, isSelected && sc.gridCellSelected, isToday && !isSelected && sc.gridCellToday]}
                    onPress={() => setSelectedDate(cellDate)}>
                    <Text style={[
                      sc.gridCellText,
                      isSelected && sc.gridCellTextSelected,
                      isToday && !isSelected && sc.gridCellTextToday,
                    ]}>{day}</Text>
                    <View style={sc.dotRow}>
                      {hasTasks && <View style={[sc.dot, { backgroundColor: '#EC4899' }]} />}
                      {hasClasses && <View style={[sc.dot, { backgroundColor: '#6366F1' }]} />}
                      {hasGroupTasks && <View style={[sc.dot, { backgroundColor: '#10B981' }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={sc.legend}>
            <View style={sc.legendItem}><View style={[sc.dot, { backgroundColor: '#EC4899' }]} /><Text style={sc.legendText}>Task due</Text></View>
            <View style={sc.legendItem}><View style={[sc.dot, { backgroundColor: '#6366F1' }]} /><Text style={sc.legendText}>Class</Text></View>
            <View style={sc.legendItem}><View style={[sc.dot, { backgroundColor: '#10B981' }]} /><Text style={sc.legendText}>Group task</Text></View>
          </View>
        </View>

        {/* Selected date info */}
        <View style={sc.sectionHeader}>
          <Text style={sc.sectionTitle}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <TouchableOpacity style={sc.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={sc.addBtnText}>Add Class</Text>
          </TouchableOpacity>
        </View>

        {/* Classes for selected day */}
        <View style={sc.section}>
          <Text style={sc.subSectionTitle}>Classes</Text>
          {selectedClasses.length === 0 ? (
            <View style={sc.emptyBox}>
              <Ionicons name="school-outline" size={28} color={MUTED} />
              <Text style={sc.emptyText}>No classes on {DAY_LABELS[selectedDate.getDay()]}s.</Text>
            </View>
          ) : selectedClasses.map(item => (
            <View key={item.id} style={sc.classRow}>
              <Text style={sc.classTime}>{item.time}</Text>
              <View style={[sc.classAccent, { backgroundColor: item.color }]} />
              <View style={sc.classBody}>
                <Text style={sc.classSubject} numberOfLines={1}>{item.subject}</Text>
                <View style={sc.classMeta}>
                  <Ionicons name="location-outline" size={12} color={MUTED} />
                  <Text style={sc.classMetaText}>{item.room}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => item.id && handleDeleteClass(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#EC4899" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tasks due on selected date */}
        <View style={sc.section}>
          <Text style={sc.subSectionTitle}>Tasks Due</Text>
          {selectedTasks.length === 0 && selectedGroupTasks.length === 0 ? (
            <View style={sc.emptyBox}>
              <Ionicons name="checkbox-outline" size={28} color={MUTED} />
              <Text style={sc.emptyText}>No tasks due on this date.</Text>
            </View>
          ) : null}
          {selectedTasks.map(t => (
            <View key={t.id} style={sc.taskRow}>
              <View style={[sc.taskDot, { backgroundColor: t.done ? '#10B981' : '#EC4899' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[sc.taskTitle, t.done && sc.taskDone]}>{t.title}</Text>
                <Text style={sc.taskMeta}>{t.subject}{t.time ? ` · ${t.time}` : ''}</Text>
              </View>
              <View style={[sc.priorityBadge, {
                backgroundColor: t.priority === 'High' ? '#EC489922' : t.priority === 'Medium' ? '#F59E0B22' : '#10B98122'
              }]}>
                <Text style={[sc.priorityText, {
                  color: t.priority === 'High' ? '#EC4899' : t.priority === 'Medium' ? '#F59E0B' : '#10B981'
                }]}>{t.priority}</Text>
              </View>
            </View>
          ))}
          {selectedGroupTasks.map(t => (
            <View key={t.id} style={sc.taskRow}>
              <View style={[sc.taskDot, { backgroundColor: t.done ? '#10B981' : '#6366F1' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[sc.taskTitle, t.done && sc.taskDone]}>{t.title}</Text>
                <Text style={sc.taskMeta}>
                  {t.subject}{t.time ? ` · ${t.time}` : ''}
                  {t.assignedToName ? ` · @${t.assignedToName}` : ''}
                </Text>
                <View style={sc.groupTaskBadge}>
                  <Ionicons name="people-outline" size={10} color="#818CF8" />
                  <Text style={sc.groupTaskBadgeText}>Group task</Text>
                </View>
              </View>
              <View style={[sc.priorityBadge, {
                backgroundColor: t.priority === 'High' ? '#EC489922' : t.priority === 'Medium' ? '#F59E0B22' : '#10B98122'
              }]}>
                <Text style={[sc.priorityText, {
                  color: t.priority === 'High' ? '#EC4899' : t.priority === 'Medium' ? '#F59E0B' : '#10B981'
                }]}>{t.priority}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <TouchableOpacity style={sc.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={sc.fabText}>Add Class</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={sc.overlay}>
          <View style={sc.sheet}>
            <Text style={sc.sheetTitle}>Add Class</Text>
            <Text style={[sc.fieldLabel, { color: '#818CF8', marginBottom: 2 }]}>
              Day: {DAY_LABELS[selectedDate.getDay()]} · {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={sc.fieldLabel}>Subject *</Text>
            <TextInput style={sc.fieldInput} placeholder="e.g. Advanced Mathematics" placeholderTextColor="#4B5563" value={newSubject} onChangeText={setNewSubject} />
            <Text style={sc.fieldLabel}>Room / Location *</Text>
            <TextInput style={sc.fieldInput} placeholder="e.g. Room 302, Science Bldg" placeholderTextColor="#4B5563" value={newRoom} onChangeText={setNewRoom} />
            <Text style={sc.fieldLabel}>Start Time *</Text>
            <SimpleTimePicker value={newTime || '08:00 AM'} onChange={setNewTime} />
            <Text style={sc.fieldLabel}>End Time (optional)</Text>
            <SimpleTimePicker value={newEndTime || '09:00 AM'} onChange={setNewEndTime} />
            <Text style={sc.fieldLabel}>Color</Text>
            <View style={sc.colorRow}>
              {SAMPLE_COLORS.map(c => (
                <TouchableOpacity key={c} style={[sc.colorSwatch, { backgroundColor: c }, newColor === c && sc.colorSwatchActive]} onPress={() => setNewColor(c)} />
              ))}
            </View>
            <View style={sc.sheetActions}>
              <TouchableOpacity style={sc.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={sc.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[sc.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddClass} disabled={saving}>
                <Text style={sc.saveBtnText}>{saving ? 'Saving...' : 'Add Class'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createScheduleStyles(BG: string, SURFACE: string, BORDER: string, TEXT: string, MUTED: string) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    screen: { flex: 1, backgroundColor: BG },
    content: { padding: 16, gap: 16, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
    title: { color: TEXT, fontSize: 22, fontWeight: '800' },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    // Calendar
    calCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 10 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
    monthText: { color: TEXT, fontSize: 15, fontWeight: '800' },
    gridRow: { flexDirection: 'row' },
    gridDayLabel: { flex: 1, textAlign: 'center', color: MUTED, fontSize: 11, fontWeight: '700', paddingBottom: 6 },
    gridCell: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, gap: 2, minHeight: 46 },
    gridCellSelected: { backgroundColor: '#6366F1' },
    gridCellToday: { backgroundColor: '#6366F122', borderWidth: 1, borderColor: '#6366F166' },
    gridCellText: { color: TEXT, fontSize: 13, fontWeight: '600' },
    gridCellTextSelected: { color: '#fff', fontWeight: '800' },
    gridCellTextToday: { color: '#818CF8', fontWeight: '800' },
    dotRow: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3 },
    legend: { flexDirection: 'row', gap: 16, paddingTop: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendText: { color: MUTED, fontSize: 11 },
    // Section
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
    subSectionTitle: { color: MUTED, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    section: { gap: 10 },
    emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 24, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
    emptyText: { color: MUTED, fontSize: 13 },
    // Classes
    classRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
    classTime: { color: MUTED, fontSize: 11, fontWeight: '600', width: 52, lineHeight: 16 },
    classAccent: { width: 3, height: 36, borderRadius: 2 },
    classBody: { flex: 1, gap: 4 },
    classSubject: { color: TEXT, fontSize: 14, fontWeight: '700' },
    classMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    classMetaText: { color: MUTED, fontSize: 12 },
    // Tasks
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
    taskDot: { width: 8, height: 8, borderRadius: 4 },
    taskTitle: { color: TEXT, fontSize: 14, fontWeight: '600' },
    taskDone: { textDecorationLine: 'line-through', color: MUTED },
    taskMeta: { color: MUTED, fontSize: 12 },
    priorityBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    priorityText: { fontSize: 11, fontWeight: '700' },
    // FAB & Modal
    fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, elevation: 4 },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
    sheetTitle: { color: TEXT, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    fieldLabel: { color: MUTED, fontSize: 13, fontWeight: '500' },
    fieldInput: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 14 },
    colorRow: { flexDirection: 'row', gap: 12 },
    colorSwatch: { width: 32, height: 32, borderRadius: 16 },
    colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 13, alignItems: 'center' },
    cancelBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
    saveBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 13, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    groupTaskBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    groupTaskBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '600' },
  });
}
