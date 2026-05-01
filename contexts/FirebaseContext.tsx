import { User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getUserProfile, onAuthChange, UserProfile, UserRole } from '../firebase/auth';

interface FirebaseContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Fetch user profile with role from Firestore
        const profile = await getUserProfile(authUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = userProfile?.role || null;
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  const value: FirebaseContextType = {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    role,
    isStudent,
    isTeacher,
    isAdmin,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
