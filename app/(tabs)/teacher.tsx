import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Student {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTasks: 0,
    activeTasks: 0,
  });

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const studentsData: Student[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'student') {
          studentsData.push({
            id: doc.id,
            username: data.username || 'Unknown',
            email: data.email || '',
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || '',
          });
        }
      });
      
      setStudents(studentsData);
      setStats({
        totalStudents: studentsData.length,
        totalTasks: 24,
        activeTasks: 12,
      });
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  function navigateToHome() {
    router.replace('/(tabs)' as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading teacher dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToHome} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome, Teacher!</Text>
          <Text style={styles.subtitle}>Manage your students and assignments</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color="#6366F1" />
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="clipboard" size={28} color="#10B981" />
            <Text style={styles.statNumber}>{stats.totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.activeTasks}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Students</Text>
          
          {students.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No students yet</Text>
            </View>
          ) : (
            students.map((student) => (
              <View key={student.id} style={styles.studentItem}>
                <View style={styles.studentIcon}>
                  <Ionicons name="person" size={20} color="#6366F1" />
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.username}</Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F3F4F6',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 14,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  studentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  studentEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
