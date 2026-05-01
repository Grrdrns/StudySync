# Admin Account Setup

## Overview

StudySync has three user roles:
- **Student** - Can signup freely, create projects, manage tasks
- **Teacher** - Can signup freely, monitor students (read-only)
- **Admin** - **Pre-assigned only**, cannot be created through public signup

## Creating Admin Accounts

### Option 1: Using the Setup Script

1. **Install dependencies:**
   ```bash
   npm install firebase dotenv
   ```

2. **Edit the admin accounts in `scripts/create-admin.js`:**
   ```javascript
   const ADMIN_ACCOUNTS = [
     {
       email: 'admin@studysync.com',
       password: 'YourSecurePassword123!',
       displayName: 'System Administrator',
       username: 'admin',
     },
     // Add more admins here
   ];
   ```

3. **Run the script:**
   ```bash
   node scripts/create-admin.js
   ```

### Option 2: Manual Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project `studysync-d7b1f`
3. Go to **Authentication** → **Users** → **Add User**
4. Create user with email/password
5. Go to **Firestore Database** → **users** collection
6. Create document with the user's UID:
   ```json
   {
     "uid": "user-uid-from-auth",
     "email": "admin@studysync.com",
     "displayName": "System Administrator",
     "username": "admin",
     "role": "admin",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }
   ```

### Option 3: Promote Existing User to Admin

1. Go to Firestore Database
2. Find the user document (users/{uid})
3. Change the `role` field from "student"/"teacher" to "admin"

## Security Notes

- **Never** share admin credentials publicly
- Change default passwords immediately after first login
- Admin accounts have full system access - create sparingly
- The signup screen intentionally blocks "admin" role selection

## Admin Capabilities

Admins can:
- ✅ View all users and their data
- ✅ Edit any user's tasks/schedule
- ✅ Delete any user account
- ✅ Change user roles (promote/demote)
- ✅ View all students' progress
- ✅ Full CRUD on all collections

## Troubleshooting

### "Admin accounts cannot be created through signup" error
This is expected! Use one of the methods above to create admin accounts.

### Script fails with "Firebase environment variables not found"
Make sure your `.env` file has all Firebase config variables set.

### Forgot admin password
Use Firebase Console → Authentication → find user → reset password
