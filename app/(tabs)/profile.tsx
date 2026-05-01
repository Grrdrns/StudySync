import { useFirebase } from '@/contexts/FirebaseContext';
import { logOut } from '@/firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, userProfile } = useFirebase();
  const router = useRouter();

  async function handleLogout() {
    console.log('🚪 Logout button pressed');
    Alert.alert('Test', 'Button is working!');
    
    // Simple logout without confirmation for testing
    try {
      console.log('🔓 Calling logOut function...');
      await logOut();
      console.log('✅ LogOut successful, redirecting to landing page...');
      router.replace('/(auth)' as any);
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {user?.displayName || 'User'}
          </Text>
          <Text style={styles.email}>
            {user?.email || 'user@example.com'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {userProfile?.role || 'student'}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="person-outline" size={20} color="#6366F1" />
              <Text style={styles.infoLabel}>Username</Text>
            </View>
            <Text style={styles.infoValue}>
              {userProfile?.username || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="mail-outline" size={20} color="#6366F1" />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>
              {user?.email || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-outline" size={20} color="#6366F1" />
              <Text style={styles.infoLabel}>Role</Text>
            </View>
            <Text style={styles.infoValue}>
              {userProfile?.role || 'student'}
            </Text>
          </View>

          {userProfile?.age && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="calendar-outline" size={20} color="#6366F1" />
                <Text style={styles.infoLabel}>Age</Text>
              </View>
              <Text style={styles.infoValue}>{userProfile.age}</Text>
            </View>
          )}

          {userProfile?.gender && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="person-outline" size={20} color="#6366F1" />
                <Text style={styles.infoLabel}>Gender</Text>
              </View>
              <Text style={styles.infoValue}>{userProfile.gender}</Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {/* Logout Button */}
          <Pressable 
            style={styles.actionButton} 
            onPress={handleLogout}
            android_ripple={{ color: '#EF4444', borderless: false }}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>
              Logout
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.appName}>StudySync</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
