import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: 'checkmark-circle-outline', color: '#6366F1', label: 'Task & Deadline Tracking' },
  { icon: 'alarm-outline', color: '#F59E0B', label: 'Smart Reminders' },
  { icon: 'calendar-outline', color: '#10B981', label: 'Class Schedule Integration' },
  { icon: 'people-outline', color: '#8B5CF6', label: 'Group Collaboration' },
];

const DOTS_COUNT = 28 * 18;

function PixelCanvas() {
  const items = Array.from({ length: DOTS_COUNT });
  return (
    <View style={styles.pixelCanvas} pointerEvents="none">
      {items.map((_, i) => {
        const r = Math.random();
        const bg = r < 0.18 ? '#F59E0B' : r < 0.34 ? '#6366F1' : r < 0.42 ? '#8B5CF6' : 'transparent';
        return <View key={i} style={[styles.pixel, { backgroundColor: bg, opacity: bg === 'transparent' ? 0 : 0.35 + Math.random() * 0.45 }]} />;
      })}
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <PixelCanvas />

      {/* Gradient overlay */}
      <View style={styles.gradientOverlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Logo area */}
        <Animated.View style={[styles.logoWrap, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>StudySync</Text>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>For Students</Text>
          </View>
        </Animated.View>

        {/* Hero copy */}
        <Animated.View style={[styles.heroSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.heroTitle}>Master your{'\n'}academic life.</Text>
          <Text style={styles.heroSub}>
            The all-in-one workspace to manage tasks, deadlines, schedules, and team projects — built for students.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.features, { opacity: fadeIn }]}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featurePill}>
              <Ionicons name={f.icon as any} size={15} color={f.color} />
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View style={[styles.ctaGroup, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/signup' as any)}>
            <Text style={styles.primaryBtnText}>Get Started — It&apos;s Free</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeIn }]}>
          <Text style={styles.footerText}>By continuing, you agree to StudySync&apos;s</Text>
          <Text style={styles.footerLink}>Terms of Service &amp; Privacy Policy</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  pixelCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height * 0.55,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pixel: {
    width: width / 28,
    height: width / 28,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    // Simulated gradient: dark at bottom, transparent at top
    backgroundColor: 'transparent',
    // We'll use a second absolute view below
  },
  safe: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  logoWrap: {
    position: 'absolute',
    top: 52,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '800',
  },
  logoBadge: {
    backgroundColor: '#6366F122',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#6366F144',
  },
  logoBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    color: '#F1F5F9',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 46,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 23,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  ctaGroup: {
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
  },
  footerLink: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '600',
  },
});
