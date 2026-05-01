import { AuthHero } from '@/components/auth-hero';
import { configureGoogleSignIn, getEmailByUsername, signIn, signInWithGoogle } from '@/firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  
  // Google Sign-In is available on all platforms via web-based auth

  // Configure Google Sign-In on component mount
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  function handleTabSwitch(t: 'login' | 'signup') {
    setTab(t);
    if (t === 'signup') router.replace('/(auth)/signup' as any);
  }

  async function handleSignIn() {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email/username and password');
      return;
    }

    setLoading(true);
    try {
      let email = emailOrUsername.trim();
      console.log('🔑 Attempting login with:', email);
      
      // Check if input is not an email (no @ symbol), treat as username
      if (!email.includes('@')) {
        console.log('👤 Input is username, looking up email...');
        // Look up email by username
        const userEmail = await getEmailByUsername(email.toLowerCase());
        console.log('📧 Found email for username:', userEmail);
        if (!userEmail) {
          console.error('❌ Username not found:', email);
          Alert.alert('Error', 'Username not found. Please check and try again.');
          setLoading(false);
          return;
        }
        email = userEmail;
      }
      
      console.log('🚀 Calling signIn with email:', email);
      console.log('🔐 Password length:', password.length);
      
      const user = await signIn(email, password);
      console.log('✅ Sign in successful! User:', user.email);
      console.log('👤 User UID:', user.uid);
      
      // Show success message before navigation
      Alert.alert('Success', 'Login successful! Redirecting to dashboard...');
      
      // Small delay to show the success message
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      console.error('🔍 Error code:', error.code);
      console.error('💬 Error message:', error.message);
      
      Alert.alert(
        'Sign In Failed',
        error.message || 'Invalid email/username or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Google Sign In Failed',
        error.message || 'Could not sign in with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)' as any)}>
          <Ionicons name="arrow-back" size={20} color="#F3F4F6" />
        </TouchableOpacity>

        <AuthHero
          title={'Master your\nacademic life.'}
          subtitle="The all-in-one workspace for students." />

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabActive]}
            onPress={() => handleTabSwitch('login')}>
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'signup' && styles.tabActive]}
            onPress={() => handleTabSwitch('signup')}>
            <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email or Username</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="student@university.edu or johndoe123"
                placeholderTextColor="#4B5563"
                autoCapitalize="none"
                autoCorrect={false}
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#6B7280" />
              </Pressable>
            </View>
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignIn}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In to Workspace</Text>
            )}
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Pressable style={styles.socialBtn} onPress={handleGoogleSignIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </Pressable>

          <Pressable style={styles.socialBtn}>
            <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don&apos;t have an account? </Text>
            <Pressable onPress={() => handleTabSwitch('signup')}>
              <Text style={styles.switchLink}>Create Account</Text>
            </Pressable>
          </View>

          <Text style={styles.legal}>
            By continuing, you agree to StudySync&apos;s Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#374151',
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  orText: {
    color: '#6B7280',
    fontSize: 13,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: '#374151',
  },
  socialBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  switchText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  switchLink: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  legal: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
});
