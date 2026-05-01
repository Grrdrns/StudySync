import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')); // 00–59
const PERIODS = ['AM', 'PM'];

interface Props {
  value: string; // "09:00 AM"
  onChange: (time: string) => void;
}

function parseTime(t: string): { hour: number; minute: string; period: string } {
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return { hour: parseInt(match[1], 10), minute: match[2], period: match[3].toUpperCase() };
  }
  return { hour: 9, minute: '00', period: 'AM' };
}

export default function SimpleTimePicker({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const parsed = parseTime(value);
  const [tempHour, setTempHour] = useState(parsed.hour);
  const [tempMinute, setTempMinute] = useState(parsed.minute);
  const [tempPeriod, setTempPeriod] = useState(parsed.period);

  function open() {
    const p = parseTime(value);
    setTempHour(p.hour);
    setTempMinute(p.minute);
    setTempPeriod(p.period);
    setVisible(true);
  }

  function confirm() {
    const h = tempHour.toString().padStart(2, '0');
    onChange(`${h}:${tempMinute} ${tempPeriod}`);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity style={tp.trigger} onPress={open}>
        <Text style={tp.triggerIcon}>🕐</Text>
        <Text style={tp.triggerText}>{value || 'Select time'}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={tp.overlay}>
          <View style={tp.sheet}>
            <Text style={tp.title}>Select Time</Text>

            {/* Hour */}
            <Text style={tp.colLabel}>Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tp.row} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[tp.chip, tempHour === h && tp.chipActive]}
                  onPress={() => setTempHour(h)}>
                  <Text style={[tp.chipText, tempHour === h && tp.chipTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Minute */}
            <Text style={tp.colLabel}>Minute</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tp.row} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[tp.chip, tp.chipSm, tempMinute === m && tp.chipActive]}
                  onPress={() => setTempMinute(m)}>
                  <Text style={[tp.chipText, tempMinute === m && tp.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* AM / PM */}
            <Text style={tp.colLabel}>Period</Text>
            <View style={tp.rowWrap}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[tp.chip, tp.chipWide, tempPeriod === p && tp.chipActive]}
                  onPress={() => setTempPeriod(p)}>
                  <Text style={[tp.chipText, tempPeriod === p && tp.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={tp.preview}>
              <Text style={tp.previewText}>
                {tempHour.toString().padStart(2, '0')}:{tempMinute} {tempPeriod}
              </Text>
            </View>

            <View style={tp.actions}>
              <TouchableOpacity style={tp.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={tp.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tp.confirmBtn} onPress={confirm}>
                <Text style={tp.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const tp = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12 },
  triggerIcon: { fontSize: 14 },
  triggerText: { color: '#F1F5F9', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, width: '100%', gap: 10 },
  title: { color: '#F1F5F9', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  colLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  row: { flexGrow: 0 },
  rowWrap: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', paddingVertical: 8, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  chipSm: { paddingHorizontal: 10, minWidth: 40 },
  chipWide: { flex: 1, alignItems: 'center' },
  chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  chipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  preview: { backgroundColor: '#6366F111', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#6366F133' },
  previewText: { color: '#818CF8', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
