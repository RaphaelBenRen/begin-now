import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, subDays, addDays, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { spacing, typography } from '../../constants/theme';

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
          <Feather name="calendar" size={16} color="rgba(255,255,255,0.5)" />
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 24,
    color: '#ffffff',
    lineHeight: 28,
  },
  arrowTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: spacing.sm + 2,
  },
  dateLabel: {
    ...typography.bodyMedium,
    color: '#ffffff',
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
    color: '#3b82f6',
    fontWeight: '600',
  },
});

const calStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  closeBtn: {
    ...typography.body,
    color: '#3b82f6',
    width: 60,
  },
  title: {
    ...typography.h3,
    color: '#ffffff',
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
    color: '#3b82f6',
    paddingHorizontal: spacing.md,
  },
  monthLabel: {
    ...typography.bodyMedium,
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: '#3b82f6',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  dayCircleLogged: {
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
  },
  dayText: {
    fontSize: 15,
    color: '#ffffff',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayTextFuture: {
    color: '#ffffff',
    opacity: 0.3,
  },
  dayTextLogged: {
    color: '#00b894',
    fontWeight: '600',
  },
});
