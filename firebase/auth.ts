import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from './config';

// Check if we're in a React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID;
const EXPO_REDIRECT_URI = 'https://auth.expo.io/@konirowa/StudySync';

// Role-Based Access Control Types
export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  role: UserRole;
  age?: number | null;
  gender?: string;
  address?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface AdditionalProfileData {
  age?: number | null;
  gender?: string;
  address?: string;
}

// Sign up a new user (defaults to 'student' role, admin NOT allowed via signup)
export async function signUp(
  email: string, 
  password: string, 
  displayName: string,
  username: string,
  additionalData?: AdditionalProfileData,
  role: 'student' | 'teacher' = 'student'
) {
  // Note: Role parameter is already constrained to 'student' | 'teacher' by TypeScript
  console.log('signUp called with:', { email, displayName, username, role });
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with display name
  await updateProfile(userCredential.user, { displayName });
  
  // Create user document in Firestore with role
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    uid: userCredential.user.uid,
    email,
    displayName,
    username: username.toLowerCase(),
    role, // student or teacher only (admin is pre-assigned)
    ...additionalData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return userCredential.user;
}

// Get user profile with role
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as UserProfile;
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  console.log('🔐 Firebase signIn called with:', { email, passwordLength: password.length });
  console.log('🔧 Auth instance:', auth);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Firebase signIn successful:', userCredential.user.email);
    console.log('👤 User UID:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Firebase signIn error:', error);
    console.error('🔍 Error code:', error.code);
    console.error('💬 Error message:', error.message);
    throw error;
  }
}

// Sign out
export async function logOut() {
  await signOut(auth);
}

// Send password reset email
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// Initialize Google Sign-In configuration
export function configureGoogleSignIn() {
  console.log('✅ Google Sign-In configured for Expo');
  console.log('📱 Redirect URI:', EXPO_REDIRECT_URI);
  console.log('✅ This URL should already be in Google Cloud Console');
}

// Sign in with Google - Works on web AND mobile (Expo Go)!
export async function signInWithGoogle() {
  try {
    console.log('🚀 Starting Google Sign-In...');
    console.log('🌐 Platform:', isReactNative ? 'React Native' : 'Web');
    
    if (isReactNative) {
      // 📱 MOBILE: Use Expo Auth Session
      return await signInWithGoogleMobile();
    } else {
      // 🌐 WEB: Use Firebase popup
      return await signInWithGoogleWeb();
    }
    
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    throw error;
  }
}

// Web Google Sign-In (Firebase popup)
async function signInWithGoogleWeb() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  // Check if popups are blocked
  const testPopup = window.open('', '', 'width=1,height=1');
  if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
    throw new Error('Popups are blocked. Please allow popups for this site in browser settings.');
  }
  testPopup.close();
  
  const userCredential = await signInWithPopup(auth, provider);
  console.log('✅ Google Sign-In successful:', userCredential.user.email);
  return userCredential.user;
}

// Mobile Google Sign-In using expo-web-browser + PKCE manual flow
async function signInWithGoogleMobile() {
  console.log('📱 Starting mobile Google Sign-In via WebBrowser...');

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured. Set EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID in .env');
  }

  // Generate PKCE code verifier (random base64url string)
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Code challenge = BASE64URL(SHA256(codeVerifier))
  const codeChallenge = (await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const state = Math.random().toString(36).substring(2);

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
    '&redirect_uri=' + encodeURIComponent(EXPO_REDIRECT_URI) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent('openid profile email') +
    '&code_challenge=' + codeChallenge +
    '&code_challenge_method=S256' +
    '&state=' + state +
    '&prompt=select_account';

  console.log('🌐 Opening Google Sign-In in browser...');
  console.log('📱 Redirect URI:', EXPO_REDIRECT_URI);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, EXPO_REDIRECT_URI);

  console.log('📬 Auth result type:', result.type);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign-in was cancelled. Please try again.');
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google Sign-In failed. Please try again.');
  }

  // Parse the authorization code from the redirect URL
  const url = new URL(result.url);
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Error('No authorization code received from Google. Please try again.');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      redirect_uri: EXPO_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }).toString(),
  });

  const tokens = await tokenResponse.json();
  console.log('🎟️ Token exchange result keys:', Object.keys(tokens));

  if (!tokens.id_token && !tokens.access_token) {
    throw new Error('No tokens received from Google. Please try again.');
  }

  const credential = GoogleAuthProvider.credential(tokens.id_token ?? null, tokens.access_token);
  const userCredential = await signInWithCredential(auth, credential);
  console.log('✅ Google Sign-In successful:', userCredential.user.email);
  return userCredential.user;
}

// Sign up with Google (for new users with role selection) - Works on web AND mobile!
export async function signUpWithGoogle(role: 'student' | 'teacher') {
  try {
    console.log('🚀 Starting Google Sign-Up...');
    console.log('🌐 Platform:', isReactNative ? 'React Native' : 'Web');
    
    let user;
    
    if (isReactNative) {
      // 📱 MOBILE: Use the same Expo Auth Session flow as sign in
      user = await signInWithGoogleMobile();
    } else {
      // 🌐 WEB: Use Firebase popup
      console.log('🌐 Opening Google Sign-Up popup...');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      user = userCredential.user;
    }
    
    // Create user document in Firestore with role
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Google User',
      username: user.email?.split('@')[0] || 'google_user',
      role: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Google Sign-Up successful:', user.email);
    return user;
    
  } catch (error: any) {
    console.error('❌ Google Sign-Up error:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-up cancelled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popups blocked. Please allow popups for this site.');
    }
    
    throw error;
  }
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Get email by username (for username login)
export async function getEmailByUsername(username: string): Promise<string | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return snapshot.docs[0].data().email || null;
}

// ========== RBAC Helper Functions ==========

// Check if user has specific role
export function hasRole(userProfile: UserProfile | null, role: UserRole): boolean {
  return userProfile?.role === role;
}

// Check if user can edit (Admin or own content)
export function canEdit(userProfile: UserProfile | null, resourceOwnerId?: string): boolean {
  if (!userProfile) return false;
  if (userProfile.role === 'admin') return true; // Admin can edit everything
  if (resourceOwnerId && resourceOwnerId === userProfile.uid) return true; // Owner can edit own content
  return false;
}

// Check if user can view (All roles can view, but teachers only view their students)
export function canView(userProfile: UserProfile | null): boolean {
  return !!userProfile; // Any authenticated user can view
}

// Check if user can create projects (Students and Admin)
export function canCreateProject(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  return userProfile.role === 'student' || userProfile.role === 'admin';
}

// Check if user can be team head (Students and Admin)
export function canBeTeamHead(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  return userProfile.role === 'student' || userProfile.role === 'admin';
}

// Check if user can monitor students (Teachers and Admin)
export function canMonitorStudents(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  return userProfile.role === 'teacher' || userProfile.role === 'admin';
}

// Check if user can view all students' progress (Teachers and Admin - read only)
export function canViewAllStudentProgress(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  return userProfile.role === 'teacher' || userProfile.role === 'admin';
}

// Check if user can edit student data (Admin only - teachers are read-only)
export function canEditStudentData(userProfile: UserProfile | null): boolean {
  return userProfile?.role === 'admin';
}
