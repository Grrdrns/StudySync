# StudySync Architecture & RBAC Documentation

## MVC Architecture

### Model (Data Layer)
**Location:** `firebase/`

| File | Purpose |
|------|---------|
| `firebase/config.ts` | Firebase initialization (Auth + Firestore) |
| `firebase/auth.ts` | User authentication, roles, RBAC helpers |
| `firebase/firestore.ts` | Data models: Task, Schedule, GroupTask + CRUD operations |

**Data Models:**
```typescript
Task { id, userId, title, course, due, priority, done }
Schedule { id, userId, subject, time, room, color, dayOfWeek }
GroupTask { id, groupId, task, assignee, due }
UserProfile { uid, email, displayName, username, role, ... }
```

### View (UI Layer)
**Location:** `app/`

| Directory | Purpose |
|-----------|---------|
| `app/(auth)/` | Authentication screens (login, signup, forgot-password) |
| `app/(tabs)/` | Main app screens (dashboard, index) |
| `components/` | Reusable UI components (auth-hero, etc.) |

### Controller (Logic Layer)
**Location:** `contexts/`, `firebase/`

| File | Purpose |
|------|---------|
| `contexts/FirebaseContext.tsx` | Global state management, auth state, user role |
| `firebase/auth.ts` | Sign in/up/out, role checking functions |
| `firebase/firestore.ts` | Database operations with RBAC queries |

---

## RBAC (Role-Based Access Control)

### Roles

#### 1. Student (Default)
- **Can:** Create projects, manage own tasks/schedule, be team head
- **Cannot:** View other students' data, edit others' content
- **UI Shows:** Personal dashboard, task management, project creation

#### 2. Teacher
- **Can:** Monitor all students, view pending/completed (read-only)
- **Cannot:** Edit student data, delete tasks
- **UI Shows:** Student list, read-only task views, progress monitoring

#### 3. Admin
- **Can:** Everything (view all, edit all, manage roles)
- **UI Shows:** All dashboards, user management, full CRUD access

### RBAC Helper Functions

```typescript
// Check role
hasRole(userProfile, 'student' | 'teacher' | 'admin')

// Permissions
canCreateProject(userProfile)     // Student + Admin
canBeTeamHead(userProfile)        // Student + Admin
canMonitorStudents(userProfile)   // Teacher + Admin
canViewAllStudentProgress(user)   // Teacher + Admin
canEditStudentData(userProfile)   // Admin only
canEdit(userProfile, ownerId)     // Admin or owner
```

### Using RBAC in Components

```tsx
import { useFirebase } from '@/contexts/FirebaseContext';

function MyComponent() {
  const { userProfile, isStudent, isTeacher, isAdmin, role } = useFirebase();
  
  // Show different UI based on role
  if (isStudent) {
    return <StudentDashboard />;
  }
  
  if (isTeacher) {
    return <TeacherMonitoringView />; // Read-only
  }
  
  if (isAdmin) {
    return <AdminPanel />; // Full access
  }
}
```

### Firestore Security Rules

File: `firestore.rules`

Enforces at database level:
- Students: CRUD on own data only
- Teachers: Read all student data, no write
- Admin: Full CRUD on everything

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

---

## Database Structure

```
users/{userId}
  - uid, email, displayName, username, role
  - age, gender, address
  - createdAt, updatedAt

tasks/{taskId}
  - userId, title, course, due, priority, done
  - createdAt, updatedAt

schedules/{scheduleId}
  - userId, subject, time, room, color, dayOfWeek
  - createdAt

groupTasks/{groupTaskId}
  - groupId, task, assignee, due
  - createdAt
```

---

## Setting Up User Roles

### Option 1: Manual Firestore Update (for testing)
Go to Firebase Console → Firestore → users/{uid} → Change `role` field

### Option 2: Admin Panel (future feature)
Create admin interface using `updateUserRole(userId, newRole)`

### Option 3: Custom Signup (for teachers/admins)
Modify signup to accept role parameter:
```typescript
await signUp(email, password, name, username, data, 'teacher');
```

---

## Security Summary

| Action | Student | Teacher | Admin |
|--------|---------|---------|-------|
| Create own tasks | ✅ | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ | ✅ |
| Delete own tasks | ✅ | ✅ | ✅ |
| View own data | ✅ | ✅ | ✅ |
| View all students | ❌ | ✅ | ✅ |
| Edit student data | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| Change roles | ❌ | ❌ | ✅ |
| Create projects | ✅ | ❌ | ✅ |
| Be team head | ✅ | ❌ | ✅ |
