import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './config';

// Types
export interface Task {
  id?: string;
  userId: string;
  title: string;
  subject: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
  done: boolean;
  time?: string;         // e.g. "09:00 AM"
  collaborators?: { uid: string; displayName: string; email: string }[];
  sharedTaskId?: string; // original task ID this was shared from
  isShared?: boolean;    // true if this is a collaborator copy
  ownerName?: string;    // display name of original task owner
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Schedule {
  id?: string;
  userId: string;
  subject: string;
  time: string;
  room: string;
  color: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  createdAt?: Timestamp;
}

export interface GroupTask {
  id?: string;
  groupId: string;
  task: string;
  assignee: string;
  due: string;
  createdAt?: Timestamp;
}

// ========== TASKS ==========

// Add a new task
export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  const taskData = {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'tasks'), taskData);
  return docRef.id;
}

// Get all tasks for a user
export async function getUserTasks(userId: string): Promise<Task[]> {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('due', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

// Subscribe to tasks real-time
export function subscribeToTasks(userId: string, callback: (tasks: Task[]) => void) {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('due', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    callback(tasks);
  });
}

// Update task
export async function updateTask(taskId: string, updates: Partial<Task>) {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Toggle task done status
export async function toggleTaskDone(taskId: string, done: boolean) {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { done, updatedAt: serverTimestamp() });
}

// Delete task
export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, 'tasks', taskId));
}

// Share a task with a new collaborator — creates a linked copy in their tasks
export async function shareTaskWithCollaborator(
  originalTask: Task,
  collaborator: { uid: string; displayName: string; email: string },
  ownerName: string
) {
  const sharedTaskId = originalTask.id!;
  // Check if already shared with this user
  const q = query(
    collection(db, 'tasks'),
    where('sharedTaskId', '==', sharedTaskId),
    where('userId', '==', collaborator.uid)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return; // already shared

  await addDoc(collection(db, 'tasks'), {
    userId: collaborator.uid,
    title: originalTask.title,
    subject: originalTask.subject,
    due: originalTask.due,
    priority: originalTask.priority,
    done: false,
    collaborators: originalTask.collaborators || [],
    sharedTaskId,
    isShared: true,
    ownerName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Sync task updates to all collaborator copies
export async function syncSharedTaskUpdates(
  originalTaskId: string,
  updates: Partial<Pick<Task, 'title' | 'subject' | 'due' | 'priority' | 'collaborators'>>
) {
  const q = query(
    collection(db, 'tasks'),
    where('sharedTaskId', '==', originalTaskId)
  );
  const snap = await getDocs(q);
  const batch = snap.docs.map(d =>
    updateDoc(doc(db, 'tasks', d.id), { ...updates, updatedAt: serverTimestamp() })
  );
  await Promise.all(batch);
}

// Remove collaborator copy when they are removed
export async function removeSharedTaskForUser(originalTaskId: string, collaboratorUid: string) {
  const q = query(
    collection(db, 'tasks'),
    where('sharedTaskId', '==', originalTaskId),
    where('userId', '==', collaboratorUid)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'tasks', d.id))));
}

// ========== TASK MESSAGES ==========

export interface TaskMessage {
  id?: string;
  taskId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt?: Timestamp;
}

export async function addTaskMessage(msg: Omit<TaskMessage, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, 'taskMessages'), {
    ...msg,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToTaskMessages(taskId: string, callback: (msgs: TaskMessage[]) => void) {
  const q = query(
    collection(db, 'taskMessages'),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskMessage)));
  });
}

// ========== SCHEDULE ==========

// Add schedule item
export async function addScheduleItem(schedule: Omit<Schedule, 'id' | 'createdAt'>) {
  const scheduleData = {
    ...schedule,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'schedules'), scheduleData);
  return docRef.id;
}

// Get user's schedule for a specific day
export async function getUserSchedule(userId: string, dayOfWeek: number): Promise<Schedule[]> {
  const q = query(
    collection(db, 'schedules'),
    where('userId', '==', userId),
    where('dayOfWeek', '==', dayOfWeek),
    orderBy('time', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
}

// Subscribe to schedule real-time
export function subscribeToSchedule(userId: string, dayOfWeek: number, callback: (schedule: Schedule[]) => void) {
  const q = query(
    collection(db, 'schedules'),
    where('userId', '==', userId),
    where('dayOfWeek', '==', dayOfWeek),
    orderBy('time', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
    callback(schedule);
  });
}

// Subscribe to ALL schedule items for a user (all days)
export function subscribeToAllSchedule(userId: string, callback: (schedule: Schedule[]) => void) {
  const q = query(
    collection(db, 'schedules'),
    where('userId', '==', userId),
    orderBy('time', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
  });
}

// Update schedule item
export async function updateScheduleItem(scheduleId: string, updates: Partial<Schedule>) {
  const scheduleRef = doc(db, 'schedules', scheduleId);
  await updateDoc(scheduleRef, { ...updates, updatedAt: serverTimestamp() });
}

// Delete schedule item
export async function deleteScheduleItem(scheduleId: string) {
  await deleteDoc(doc(db, 'schedules', scheduleId));
}

// ========== GROUP TASKS ==========

// Add group task
export async function addGroupTask(groupTask: Omit<GroupTask, 'id' | 'createdAt'>) {
  const groupTaskData = {
    ...groupTask,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'groupTasks'), groupTaskData);
  return docRef.id;
}

// Get group tasks
export async function getGroupTasks(groupId: string): Promise<GroupTask[]> {
  const q = query(
    collection(db, 'groupTasks'),
    where('groupId', '==', groupId),
    orderBy('due', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupTask));
}

// Subscribe to group tasks real-time
export function subscribeToGroupTasks(groupId: string, callback: (tasks: GroupTask[]) => void) {
  const q = query(
    collection(db, 'groupTasks'),
    where('groupId', '==', groupId),
    orderBy('due', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupTask));
    callback(tasks);
  });
}

// Update group task
export async function updateGroupTask(taskId: string, updates: Partial<GroupTask>) {
  const taskRef = doc(db, 'groupTasks', taskId);
  await updateDoc(taskRef, { ...updates, updatedAt: serverTimestamp() });
}

// Delete group task
export async function deleteGroupTask(taskId: string) {
  await deleteDoc(doc(db, 'groupTasks', taskId));
}

// ========== RBAC: Teacher & Admin Queries ==========

// Get all students (for teachers and admins)
export async function getAllStudents(): Promise<{ uid: string; displayName: string; email: string; username: string; role: string }[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName,
      email: data.email,
      username: data.username,
      role: data.role,
    };
  });
}

// Get all tasks for a specific student (for teacher monitoring)
export async function getStudentTasks(studentId: string): Promise<Task[]> {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', studentId),
    orderBy('due', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

// Subscribe to all tasks (for admin view)
export function subscribeToAllTasks(callback: (tasks: Task[]) => void) {
  const q = query(
    collection(db, 'tasks'),
    orderBy('due', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    callback(tasks);
  });
}

// Get all users (admin only)
export async function getAllUsers(): Promise<{ uid: string; displayName: string; email: string; role: string; username: string }[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      username: data.username,
    };
  });
}


// Update user role (admin only)
export async function updateUserRole(userId: string, newRole: 'student' | 'teacher' | 'admin') {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { 
    role: newRole, 
    updatedAt: serverTimestamp() 
  });
}

// ========== STUDY GROUPS ==========

export interface StudyGroup {
  id?: string;
  name: string;
  ownerUid: string;
  ownerName: string;
  memberUids: string[]; // all member uids including owner
  members: { uid: string; displayName: string; email: string }[];
  adminUids?: string[]; // members promoted to admin (subset of memberUids, excludes owner)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GroupChatMessage {
  id?: string;
  groupId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt?: Timestamp;
}

export interface GroupSharedTask {
  id?: string;
  groupId: string;
  title: string;
  subject: string;
  due: string;
  time?: string;
  priority: 'High' | 'Medium' | 'Low';
  assignedTo?: string; // uid
  assignedToName?: string;
  done: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Create a study group
export async function createStudyGroup(group: Omit<StudyGroup, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'studyGroups'), {
    ...group,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Subscribe to all groups where user is a member
export function subscribeToStudyGroups(userId: string, callback: (groups: StudyGroup[]) => void) {
  const q = query(
    collection(db, 'studyGroups'),
    where('memberUids', 'array-contains', userId)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
  });
}

// Add member to group
export async function addMemberToGroup(groupId: string, member: { uid: string; displayName: string; email: string }, memberUids: string[], members: StudyGroup['members']) {
  await updateDoc(doc(db, 'studyGroups', groupId), {
    memberUids: [...memberUids, member.uid],
    members: [...members, member],
    updatedAt: serverTimestamp(),
  });
}

// Remove member from group
export async function removeMemberFromGroup(groupId: string, uid: string, memberUids: string[], members: StudyGroup['members']) {
  await updateDoc(doc(db, 'studyGroups', groupId), {
    memberUids: memberUids.filter(id => id !== uid),
    members: members.filter(m => m.uid !== uid),
    updatedAt: serverTimestamp(),
  });
}

// Delete study group
export async function deleteStudyGroup(groupId: string) {
  await deleteDoc(doc(db, 'studyGroups', groupId));
}

// ── Group Chat ──

export async function sendGroupMessage(msg: Omit<GroupChatMessage, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'groupMessages'), {
    ...msg,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToGroupMessages(groupId: string, callback: (msgs: GroupChatMessage[]) => void) {
  const q = query(
    collection(db, 'groupMessages'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupChatMessage)));
  });
}

// ── Group Shared Tasks ──

export async function addGroupSharedTask(task: Omit<GroupSharedTask, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'groupSharedTasks'), {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToGroupSharedTasks(groupId: string, callback: (tasks: GroupSharedTask[]) => void) {
  const q = query(
    collection(db, 'groupSharedTasks'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupSharedTask)));
  });
}

export async function toggleGroupSharedTaskDone(taskId: string, done: boolean) {
  await updateDoc(doc(db, 'groupSharedTasks', taskId), { done, updatedAt: serverTimestamp() });
}

export async function updateGroupSharedTask(taskId: string, updates: Partial<GroupSharedTask>) {
  await updateDoc(doc(db, 'groupSharedTasks', taskId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteGroupSharedTask(taskId: string) {
  await deleteDoc(doc(db, 'groupSharedTasks', taskId));
}

// ========== TEACHER VIEW ==========

// Subscribe to ALL tasks across all students (teacher read-only view)
export function subscribeToAllStudentTasks(callback: (tasks: (Task & { ownerName?: string })[]) => void) {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task & { ownerName?: string })));
  });
}

// Subscribe to ALL study groups (teacher sees every group)
export function subscribeToAllStudyGroups(callback: (groups: StudyGroup[]) => void) {
  const q = query(collection(db, 'studyGroups'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
  });
}

// ========== TEACHER-ASSIGNED TASKS ==========

export interface AssignedTask {
  id?: string;
  teacherUid: string;
  teacherName: string;
  title: string;
  description: string;
  subject: string;          // class/section
  dueDate: string;          // "Oct 28, 2025"
  dueTime: string;          // "11:59 PM"
  dueDateTimestamp: number; // ms epoch — for deadline comparison
  priority: 'High' | 'Medium' | 'Low';
  assignedToUids: string[];
  attachmentUrl?: string;   // teacher-uploaded PDF/doc download URL
  attachmentName?: string;  // original filename
  createdAt?: Timestamp;
}

export interface AssignedTaskSubmission {
  id?: string;
  assignedTaskId: string;
  studentUid: string;
  studentName: string;
  submittedAt?: Timestamp;
  note?: string;
  fileUrl?: string;    // student-uploaded file download URL
  fileName?: string;   // original filename
  fileType?: string;   // mime type
}

// ── Cloudinary file upload helper (free, no Firebase Storage needed) ──
const CLOUDINARY_CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'studysync_uploads';

export async function uploadAssignmentFile(
  _uid: string,
  _folder: 'assignments' | 'submissions',
  _taskId: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        try { resolve(JSON.parse(xhr.responseText).secure_url); }
        catch { reject(new Error('Cloudinary parse error')); }
      } else { reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`)); }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function addAssignedTask(task: Omit<AssignedTask, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, 'assignedTasks'), {
    ...task,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitAssignedTask(sub: Omit<AssignedTaskSubmission, 'id' | 'submittedAt'>) {
  await addDoc(collection(db, 'assignedTaskSubmissions'), {
    ...sub,
    submittedAt: serverTimestamp(),
  });
}

// Teacher: subscribe to all tasks they published
export function subscribeToTeacherAssignedTasks(teacherUid: string, callback: (tasks: AssignedTask[]) => void) {
  const q = query(collection(db, 'assignedTasks'), where('teacherUid', '==', teacherUid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTask)));
  });
}

// Student: subscribe to tasks assigned to them
export function subscribeToStudentAssignedTasks(studentUid: string, callback: (tasks: AssignedTask[]) => void) {
  const q = query(collection(db, 'assignedTasks'), where('assignedToUids', 'array-contains', studentUid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTask)));
  });
}

// Student: get their own submissions (to know which tasks are already submitted)
export function subscribeToStudentSubmissions(studentUid: string, callback: (subs: AssignedTaskSubmission[]) => void) {
  const q = query(collection(db, 'assignedTaskSubmissions'), where('studentUid', '==', studentUid));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTaskSubmission)));
  });
}

// Teacher: get all submissions for a specific assigned task
export function subscribeToTaskSubmissions(assignedTaskId: string, callback: (subs: AssignedTaskSubmission[]) => void) {
  const q = query(collection(db, 'assignedTaskSubmissions'), where('assignedTaskId', '==', assignedTaskId));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTaskSubmission)));
  });
}

// ========== ANNOUNCEMENTS ==========

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  category: 'General' | 'Exam' | 'Homework' | 'Reminder' | 'Event';
  pinned: boolean;
  teacherUid: string;
  teacherName: string;
  createdAt?: Timestamp;
}

export async function addAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, 'announcements'), {
    ...ann,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteAnnouncement(announcementId: string) {
  await deleteDoc(doc(db, 'announcements', announcementId));
}

export function subscribeToAnnouncements(callback: (anns: Announcement[]) => void) {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
  });
}

// Promote or demote a group member to/from admin
export async function setGroupMemberAdmin(groupId: string, uid: string, makeAdmin: boolean, currentAdminUids: string[]) {
  const next = makeAdmin
    ? [...new Set([...currentAdminUids, uid])]
    : currentAdminUids.filter(id => id !== uid);
  await updateDoc(doc(db, 'studyGroups', groupId), { adminUids: next, updatedAt: serverTimestamp() });
}

// Ensure teacher is silently added as a member of a group (read-only presence)
export async function ensureTeacherInGroup(
  groupId: string,
  teacherUid: string,
  teacherName: string,
  teacherEmail: string,
  currentMemberUids: string[],
  currentMembers: StudyGroup['members']
) {
  if (currentMemberUids.includes(teacherUid)) return;
  await updateDoc(doc(db, 'studyGroups', groupId), {
    memberUids: [...currentMemberUids, teacherUid],
    members: [...currentMembers, { uid: teacherUid, displayName: teacherName, email: teacherEmail }],
    updatedAt: serverTimestamp(),
  });
}
