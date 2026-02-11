import { View, TouchableOpacity, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../utils/dateUtils';
import { useState, useEffect, useRef } from 'react';

interface DaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const generateDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = -7; i <= 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const days = generateDays();
  const todayIndex = 7; // Center of -7 to 7 range

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: todayIndex * 120,
        animated: false,
      });
    }, 100);
  }, []);

  const currentDayIndex = days.findIndex(day => 
    day.toDateString() === selectedDate.toDateString()
  );

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      const newDate = days[currentDayIndex - 1];
      onSelectDate(newDate);
    }
  };

  const handleNextDay = () => {
    if (currentDayIndex < days.length - 1) {
      const newDate = days[currentDayIndex + 1];
      onSelectDate(newDate);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolling(false);
    const offsetX = event.nativeEvent.contentOffset.x;
    const nearestIndex = Math.round(offsetX / 120);
    if (nearestIndex >= 0 && nearestIndex < days.length) {
      onSelectDate(days[nearestIndex]);
    }
  };

  return (
    <View className="flex-row items-center justify-center px-4 mt-8">
      <TouchableOpacity onPress={handlePrevDay} className="p-2">
        <Ionicons name="chevron-back" size={24} color="#0B4D26" />
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        onScrollBeginDrag={() => setIsScrolling(true)}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={120}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 40 }}
      >
        <View className="flex-row justify-center">
          {days.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const { dayName } = formatDate(day);

            let dayText = isToday ? 'Today' :
              index === todayIndex - 1 ? 'Yesterday' :
              index === todayIndex + 1 ? 'Tomorrow' :
              dayName;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => onSelectDate(day)}
                className={`px-6 py-2 mx-1 rounded-full ${
                  isSelected ? 'bg-[#0B4D26]' : 'bg-[#D3E7D8]'
                }`}
                style={{ width: 120 }}
              >
                <Text className={`${
                  isSelected ? 'text-white' : 'text-[#0B4D26]'
                } font-medium text-center`}>
                  {dayText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity onPress={handleNextDay} className="p-2">
        <Ionicons name="chevron-forward" size={24} color="#0B4D26" />
      </TouchableOpacity>
    </View>
  );
}