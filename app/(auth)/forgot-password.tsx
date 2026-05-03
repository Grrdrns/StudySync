import { resetPassword } from '@/firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendReset() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      Alert.alert(
        'Email Sent',
        'Check your inbox for the password reset link. If you don\'t see it, check your spam folder.'
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Failed to Send',
        error.message || 'Could not send reset email. Please check your email address and try again.'
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

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#F3F4F6" />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={28} color="#818CF8" />
          </View>
        </View>

        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your email address below and we&apos;ll send you a link to reset your password.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your student email"
              placeholderTextColor="#4B5563"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={handleSendReset}
          disabled={loading}>
          <Text style={styles.primaryBtnText}>
            {loading ? 'Sending...' : sent ? 'Resend Email' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>

        <View style={styles.backToLogin}>
          <Text style={styles.backText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpIconWrap}>
            <Ionicons name="help-circle-outline" size={20} color="#818CF8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Need help?</Text>
            <Text style={styles.helpText}>
              Contact StudySync support if you&apos;re having trouble accessing your account.
            </Text>
          </View>
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
  scroll: {
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 32,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F3F4F6',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: 16,
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
  primaryBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  backLink: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 16,
  },
  helpIconWrap: {
    marginTop: 1,
  },
  helpTitle: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
  },
});
