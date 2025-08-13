import { View, Text } from 'react-native';
import { formatDate } from '../../utils/dateUtils';

interface WeatherHeaderProps {
  selectedDate: Date;
  temperature: string;
  condition: string;
  location: string;
}

export default function WeatherHeader({ selectedDate, temperature, condition, location }: WeatherHeaderProps) {
  const { fullDate, dayName } = formatDate(selectedDate);
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <View className="items-center mt-8">
      <Text className="text-2xl font-medium text-[#0B4D26]">
        {isToday ? 'Today' : dayName}
      </Text>
      <Text className="text-sm text-[#0B4D26] mt-1">{fullDate}</Text>
      <Text className="text-[100px] leading-[120px] font-light text-[#0B4D26]">
        {temperature}
      </Text>
      <Text className="text-lg text-[#0B4D26]">{location}</Text>
      <Text className="text-lg text-[#0B4D26] capitalize">{condition}</Text>
    </View>
  );
}