import { AuthHero } from '@/components/auth-hero';
import { configureGoogleSignIn, signUp, signUpWithGoogle } from '@/firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(password: string): { strength: PasswordStrength; message: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: 'weak', message: 'Weak - Add more complexity', color: '#EF4444' };
  if (score === 3) return { strength: 'fair', message: 'Fair - Could be stronger', color: '#F59E0B' };
  if (score === 4) return { strength: 'good', message: 'Good password', color: '#10B981' };
  return { strength: 'strong', message: 'Strong password!', color: '#059669' };
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a special character' };
  }
  return { valid: true, message: '' };
}

const ROLES = ['student', 'teacher'] as const;

export default function SignupScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    requestLocationPermission();
    configureGoogleSignIn();
  }, []);

  async function requestLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      detectLocation();
    }
  }

  async function detectLocation() {
    setLocationLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Reverse geocode to get address
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResult) {
        const formattedAddress = [
          addressResult.street,
          addressResult.city,
          addressResult.region,
          addressResult.country,
        ].filter(Boolean).join(', ');
        
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.log('Location detection failed:', error);
      // Silent fail - user can enter manually
    } finally {
      setLocationLoading(false);
    }
  }

  function handleTabSwitch(t: 'login' | 'signup') {
    setTab(t);
    if (t === 'login') router.replace('/(auth)/login' as any);
  }

  async function handleSignUp() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Full Name, Username, Email, Password)');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Weak Password', passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Ensure role is always defined
      const selectedRole = role || 'student';
      console.log('Signing up with role:', selectedRole);
      
      await signUp(email.trim(), password, fullName.trim(), username.trim(), {
        age: age ? parseInt(age) : null,
        gender,
        address,
      }, selectedRole);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Sign Up Failed',
        error.message || 'Could not create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setLoading(true);
    try {
      await signUpWithGoogle(role);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Google Sign Up Failed',
        error.message || 'Could not sign up with Google. Please try again.'
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
          title={'Create Account'}
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
            <Text style={styles.label}>I am a <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowRolePicker(!showRolePicker)}>
              <Ionicons name="school-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <Text style={[styles.input, { flex: 1, textTransform: 'capitalize' }]}>
                {role}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
            {showRolePicker && (
              <View style={styles.dropdown}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.dropdownItem}
                    onPress={() => { setRole(r); setShowRolePicker(false); }}>
                    <Text style={[styles.dropdownText, { textTransform: 'capitalize' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.roleHint}>
              {role === 'student' 
                ? 'Students can create projects, manage tasks, and be team heads.' 
                : 'Teachers can monitor all students and view progress (read-only).'}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="at-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="johndoe123"
                placeholderTextColor="#4B5563"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="student@university.edu"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.rowTwo}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor="#4B5563"
                  keyboardType="number-pad"
                  maxLength={3}
                  value={age}
                  onChangeText={setAge}
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowGenderPicker(!showGenderPicker)}>
                <Ionicons name="people-outline" size={16} color="#6B7280" style={styles.inputIcon} />
                <Text style={[styles.input, { color: gender ? '#F3F4F6' : '#4B5563' }]}>
                  {gender || 'Select'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6B7280" />
              </TouchableOpacity>
              {showGenderPicker && (
                <View style={styles.dropdown}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={styles.dropdownItem}
                      onPress={() => { setGender(g); setShowGenderPicker(false); }}>
                      <Text style={styles.dropdownText}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Home Address</Text>
              <TouchableOpacity 
                style={styles.detectLocationBtn} 
                onPress={detectLocation}
                disabled={locationLoading}>
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#818CF8" />
                ) : (
                  <>
                    <Ionicons name="locate-outline" size={12} color="#818CF8" />
                    <Text style={styles.detectLocationText}>Auto-detect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="123 University Ave, Campus City"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
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
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBarContainer}>
                  <View style={[styles.strengthBar, { width: passwordStrength.strength === 'weak' ? '25%' : passwordStrength.strength === 'fair' ? '50%' : passwordStrength.strength === 'good' ? '75%' : '100%', backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.message}
                </Text>
                <Text style={styles.passwordRequirements}>
                  Min 8 chars, uppercase, lowercase, number & special char
                </Text>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#6B7280" />
              </Pressable>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.passwordMismatch}>Passwords do not match</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => handleTabSwitch('login')}>
              <Text style={styles.switchLink}>Log In</Text>
            </TouchableOpacity>
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
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
  required: {
    color: '#EC4899',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  detectLocationText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '500',
  },
  passwordStrength: {
    gap: 6,
    marginTop: 6,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordRequirements: {
    color: '#6B7280',
    fontSize: 11,
  },
  passwordMismatch: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  roleHint: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
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
  dropdown: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    marginTop: 2,
    zIndex: 999,
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dropdownText: {
    color: '#F3F4F6',
    fontSize: 14,
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
