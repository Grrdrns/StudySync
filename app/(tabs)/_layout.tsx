import { HapticTab } from '@/components/haptic-tab';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const { userProfile } = useFirebase();
  const isTeacher = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

  const tabBarStyle = {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle,
        tabBarActiveTintColor: isTeacher ? '#A78BFA' : '#818CF8',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}>

      {/* ── Shared: index renders StudentDashboard or TeacherDashboard by role ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Student-only tabs ── */}
      <Tabs.Screen
        name="tasks"
        options={isTeacher ? { href: null } : {
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={isTeacher ? { href: null } : {
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collaborate"
        options={isTeacher ? { href: null } : {
          title: 'Collab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Teacher-only tabs ── */}
      <Tabs.Screen
        name="teacher-announcements"
        options={isTeacher ? {
          title: 'Announce',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        } : { href: null }}
      />
      <Tabs.Screen
        name="teacher-tasks"
        options={isTeacher ? {
          title: 'Assign Task',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        } : { href: null }}
      />

      {/* ── Shared: Settings/Profile ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Hidden legacy route ── */}
      <Tabs.Screen name="teacher" options={{ href: null }} />
    </Tabs>
  );
}
