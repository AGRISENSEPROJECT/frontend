import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../utils/dateUtils';
import { useEffect, useRef } from 'react';

interface DaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const ITEM_WIDTH = 88;

export default function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  const generateDays = () => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = -3; i <= 4; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const days = generateDays();
  const todayIndex = 3;

  useEffect(() => {
    const selectedIndex = days.findIndex(
      (day) => day.toDateString() === selectedDate.toDateString(),
    );
    const index = selectedIndex >= 0 ? selectedIndex : todayIndex;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: Math.max(0, index * (ITEM_WIDTH + 8) - 40),
        animated: true,
      });
    }, 80);
  }, [selectedDate]);

  const currentDayIndex = days.findIndex(
    (day) => day.toDateString() === selectedDate.toDateString(),
  );

  const handlePrevDay = () => {
    if (currentDayIndex > 0) onSelectDate(days[currentDayIndex - 1]);
  };

  const handleNextDay = () => {
    if (currentDayIndex < days.length - 1) onSelectDate(days[currentDayIndex + 1]);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nearestIndex = Math.round(offsetX / (ITEM_WIDTH + 8));
    if (nearestIndex >= 0 && nearestIndex < days.length) {
      onSelectDate(days[nearestIndex]);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={handlePrevDay} style={styles.arrow} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color="#0B4D26" />
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={ITEM_WIDTH + 8}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
      >
        {days.map((day, index) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const { dayName } = formatDate(day);

          const dayText = isToday
            ? 'Today'
            : index === todayIndex - 1
              ? 'Yesterday'
              : index === todayIndex + 1
                ? 'Tomorrow'
                : dayName.slice(0, 3);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              onPress={() => onSelectDate(day)}
              activeOpacity={0.88}
              style={[styles.chip, isSelected && styles.chipActive]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {dayText}
              </Text>
              <Text style={[styles.chipDate, isSelected && styles.chipTextActive]}>
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity onPress={handleNextDay} style={styles.arrow} hitSlop={8}>
        <Ionicons name="chevron-forward" size={20} color="#0B4D26" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 8,
    gap: 8,
  },
  chip: {
    width: ITEM_WIDTH,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#0B4D26',
    borderColor: '#0B4D26',
  },
  chipText: {
    color: '#0B4D26',
    fontWeight: '800',
    fontSize: 12,
  },
  chipDate: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 2,
  },
  chipTextActive: {
    color: '#fff',
  },
});
