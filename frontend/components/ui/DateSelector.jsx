import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { format, subDays, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { colors, spacing, radius, typography } from '../../constants/theme';

const DAYS_BACK = 13; // 14 jours en tout avec aujourd'hui

export default function DateSelector({ selectedDate, onSelectDate }) {
  const scrollRef = useRef(null);

  const days = Array.from({ length: DAYS_BACK + 1 }, (_, i) =>
    subDays(new Date(), DAYS_BACK - i)
  );

  // Auto-scroll vers aujourd'hui au montage
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day, index) => {
        const selected = isSameDay(day, selectedDate);
        const todayDay = isToday(day);

        return (
          <TouchableOpacity
            key={index}
            style={[styles.dayBtn, selected && styles.dayBtnSelected]}
            onPress={() => onSelectDate(day)}
          >
            <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
              {format(day, 'EEE', { locale: fr }).slice(0, 3)}
            </Text>
            <Text style={[styles.dayNum, selected && styles.dayTextSelected]}>
              {format(day, 'd')}
            </Text>
            {todayDay && (
              <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dayBtn: {
    width: 44,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayName: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'capitalize',
  },
  dayNum: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  dayTextSelected: {
    color: '#fff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 1,
  },
  todayDotSelected: {
    backgroundColor: '#fff',
  },
});
