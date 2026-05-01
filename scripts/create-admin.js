// Script to create pre-assigned admin accounts
// Usage: node scripts/create-admin.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Admin accounts to create (pre-assigned)
const ADMIN_ACCOUNTS = [
  {
    email: 'admin@studysync.com',
    password: 'Admin@123456!', // Change this!
    displayName: 'System Administrator',
    username: 'admin',
  },
  // Add more admin accounts here
];

async function createAdminAccount(adminData) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password
    );

    // Create admin document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: adminData.email,
      displayName: adminData.displayName,
      username: adminData.username.toLowerCase(),
      role: 'admin', // Pre-assigned admin role
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Admin account created: ${adminData.email}`);
    return userCredential.user;
  } catch (error) {
    console.error(`❌ Failed to create admin ${adminData.email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('Creating pre-assigned admin accounts...\n');
  
  for (const admin of ADMIN_ACCOUNTS) {
    try {
      await createAdminAccount(admin);
    } catch (error) {
      // Continue with next admin even if one fails
      console.log('Continuing...\n');
    }
  }
  
  console.log('\n✨ Admin setup complete!');
  console.log('Note: Change the default password after first login.');
  process.exit(0);
}

// Check if running directly
if (require.main === module) {
  // Ensure environment variables are loaded
  require('dotenv').config();
  
  if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    console.error('❌ Error: Firebase environment variables not found.');
    console.error('Make sure .env file exists with Firebase config.');
    process.exit(1);
  }
  
  main();
}

module.exports = { createAdminAccount };
