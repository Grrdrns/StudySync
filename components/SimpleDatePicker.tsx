import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

export default function SimpleDatePicker({ value, onChange, minimumDate }: Props) {
  const [visible, setVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const today = minimumDate || new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function confirm() {
    onChange(tempDate);
    setVisible(false);
  }

  function setMonth(month: number) {
    const d = new Date(tempDate);
    d.setMonth(month);
    const maxDay = new Date(d.getFullYear(), month + 1, 0).getDate();
    if (d.getDate() > maxDay) d.setDate(maxDay);
    setTempDate(d);
  }

  function setDay(day: number) {
    const d = new Date(tempDate);
    d.setDate(day);
    setTempDate(d);
  }

  function setYear(year: number) {
    const d = new Date(tempDate);
    d.setFullYear(year);
    setTempDate(d);
  }

  const displayStr = value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <TouchableOpacity style={dp.trigger} onPress={() => { setTempDate(value); setVisible(true); }}>
        <Text style={dp.triggerIcon}>📅</Text>
        <Text style={dp.triggerText}>{displayStr}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={dp.overlay}>
          <View style={dp.sheet}>
            <Text style={dp.title}>Select Date</Text>

            {/* Month row */}
            <Text style={dp.colLabel}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dp.row} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[dp.chip, tempDate.getMonth() === i && dp.chipActive]}
                  onPress={() => setMonth(i)}>
                  <Text style={[dp.chipText, tempDate.getMonth() === i && dp.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Day row */}
            <Text style={dp.colLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dp.row} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {days.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[dp.chip, dp.chipSm, tempDate.getDate() === d && dp.chipActive]}
                  onPress={() => setDay(d)}>
                  <Text style={[dp.chipText, tempDate.getDate() === d && dp.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Year row */}
            <Text style={dp.colLabel}>Year</Text>
            <View style={dp.yearRow}>
              {years.map(y => (
                <TouchableOpacity
                  key={y}
                  style={[dp.chip, dp.yearChip, tempDate.getFullYear() === y && dp.chipActive]}
                  onPress={() => setYear(y)}>
                  <Text style={[dp.chipText, tempDate.getFullYear() === y && dp.chipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={dp.preview}>
              <Text style={dp.previewText}>
                {tempDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            <View style={dp.actions}>
              <TouchableOpacity style={dp.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={dp.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dp.confirmBtn} onPress={confirm}>
                <Text style={dp.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dp = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12 },
  triggerIcon: { fontSize: 14 },
  triggerText: { color: '#F1F5F9', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, width: '100%', gap: 10 },
  title: { color: '#F1F5F9', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  colLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  row: { flexGrow: 0 },
  chip: { borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', paddingVertical: 8, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  chipSm: { paddingHorizontal: 10, minWidth: 36 },
  chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  chipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearChip: { paddingHorizontal: 16 },
  preview: { backgroundColor: '#6366F111', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#6366F133' },
  previewText: { color: '#818CF8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 1, borderRadius: 12, backgroundColor: '#6366F1', paddingVertical: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
