import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DOTS = 30;
const COLS = 22;

function PixelGrid() {
  const cells = Array.from({ length: DOTS * COLS });
  return (
    <View style={styles.grid}>
      {cells.map((_, i) => {
        const rand = Math.random();
        const bg = rand < 0.3 ? '#F59E0B' : rand < 0.55 ? '#818CF8' : 'transparent';
        return <View key={i} style={[styles.dot, { backgroundColor: bg }]} />;
      })}
    </View>
  );
}

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.hero}>
      <PixelGrid />
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>StudySync</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1F35',
    marginBottom: 8,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dot: {
    width: `${100 / 22}%` as any,
    aspectRatio: 1,
    borderRadius: 2,
    margin: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  badgeText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 13,
  },
});
