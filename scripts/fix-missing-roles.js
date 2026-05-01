// Script to add missing role field to existing users
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

async function fixMissingRoles() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log('Finding users without role field...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let fixedCount = 0;
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      
      if (!userData.role) {
        // Default to 'student' for existing users without role
        await updateDoc(doc(db, 'users', userDoc.id), {
          role: 'student',
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Added role to user: ${userData.email || userData.displayName}`);
        fixedCount++;
      }
    }
    
    console.log(`\n✨ Fixed ${fixedCount} users with missing roles`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing roles:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  require('dotenv').config();
  
  if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    console.error('❌ Firebase environment variables not found');
    process.exit(1);
  }
  
  fixMissingRoles();
}

module.exports = { fixMissingRoles };
