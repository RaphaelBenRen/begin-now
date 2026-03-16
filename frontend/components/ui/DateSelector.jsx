import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { format, subDays, addDays, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function DateSelector({ selectedDate, onSelectDate, loggedDates = [] }) {
  const [calendarVisible, setCalendarVisible] = useState(false);

  const goBack = () => onSelectDate(subDays(selectedDate, 1));
  const goForward = () => {
    if (!isToday(selectedDate)) onSelectDate(addDays(selectedDate, 1));
  };
  const goToday = () => onSelectDate(new Date());

  const label = isToday(selectedDate)
    ? "Aujourd'hui"
    : format(selectedDate, 'EEEE d MMMM', { locale: fr });

  return (
    <>
      <View style={styles.container}>
        {/* Flèche gauche */}
        <TouchableOpacity style={styles.arrowBtn} onPress={goBack}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        {/* Label date — tap pour ouvrir le calendrier */}
        <TouchableOpacity style={styles.dateBtn} onPress={() => setCalendarVisible(true)}>
          <Text style={styles.dateLabel}>{label}</Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>

        {/* Flèche droite (grisée si aujourd'hui) */}
        <TouchableOpacity
          style={[styles.arrowBtn, isToday(selectedDate) && styles.arrowDisabled]}
          onPress={goForward}
          disabled={isToday(selectedDate)}
        >
          <Text style={[styles.arrowText, isToday(selectedDate) && styles.arrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Bouton retour à aujourd'hui si pas aujourd'hui */}
      {!isToday(selectedDate) && (
        <TouchableOpacity style={styles.todayBtn} onPress={goToday}>
          <Text style={styles.todayBtnText}>Revenir à aujourd'hui</Text>
        </TouchableOpacity>
      )}

      {/* Modal calendrier */}
      <CalendarModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        loggedDates={loggedDates}
        onSelectDate={(d) => { onSelectDate(d); setCalendarVisible(false); }}
        onClose={() => setCalendarVisible(false)}
      />
    </>
  );
}

// ─── Calendrier mensuel ─────────────────────────────────────────

function CalendarModal({ visible, selectedDate, loggedDates, onSelectDate, onClose }) {
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Jours vides avant le 1er (lundi = 0)
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // lundi-based
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const loggedSet = new Set(loggedDates);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={calStyles.container}>
        {/* Header */}
        <View style={calStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={calStyles.closeBtn}>Fermer</Text>
          </TouchableOpacity>
          <Text style={calStyles.title}>Calendrier</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Navigation mois */}
        <View style={calStyles.monthNav}>
          <TouchableOpacity onPress={() => setViewMonth(subMonths(viewMonth, 1))}>
            <Text style={calStyles.monthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={calStyles.monthLabel}>
            {format(viewMonth, 'MMMM yyyy', { locale: fr })}
          </Text>
          <TouchableOpacity onPress={() => setViewMonth(addMonths(viewMonth, 1))}>
            <Text style={calStyles.monthArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={calStyles.weekRow}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <Text key={d} style={calStyles.weekDay}>{d}</Text>
          ))}
        </View>

        {/* Grille des jours */}
        <ScrollView>
          <View style={calStyles.grid}>
            {blanks.map((b) => (
              <View key={`blank-${b}`} style={calStyles.dayCell} />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const future = isFuture(day);
              const hasLog = loggedSet.has(dateStr);

              return (
                <View key={dateStr} style={calStyles.dayCell}>
                  <TouchableOpacity
                    style={[
                      calStyles.dayCircle,
                      isSelected && calStyles.dayCircleSelected,
                      today && !isSelected && calStyles.dayCircleToday,
                      hasLog && !isSelected && !today && calStyles.dayCircleLogged,
                    ]}
                    onPress={() => !future && onSelectDate(day)}
                    disabled={future}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      calStyles.dayText,
                      isSelected && calStyles.dayTextSelected,
                      future && calStyles.dayTextFuture,
                      hasLog && !isSelected && !future && calStyles.dayTextLogged,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 24,
    color: colors.text.primary,
    lineHeight: 28,
  },
  arrowTextDisabled: {
    color: colors.text.muted,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  dateLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  calendarIcon: {
    fontSize: 16,
  },
  todayBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  todayBtnText: {
    ...typography.small,
    color: colors.accent,
    fontWeight: '600',
  },
});

const calStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    ...typography.body,
    color: colors.accent,
    width: 60,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  monthArrow: {
    fontSize: 28,
    color: colors.accent,
    paddingHorizontal: spacing.md,
  },
  monthLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dayCell: {
    width: '14.28%',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.accent,
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dayCircleLogged: {
    backgroundColor: colors.successLight,
  },
  dayText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextFuture: {
    color: colors.text.muted,
    opacity: 0.4,
  },
  dayTextLogged: {
    color: colors.success,
    fontWeight: '600',
  },
});
