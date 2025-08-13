import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useContext, useState } from 'react';
import { SidebarContext } from '../context/SidebarContext';

export default function Forecast() {
  const router = useRouter();
  const { toggleSidebar } = useContext(SidebarContext) || {};
  const params = useLocalSearchParams();
  const [selectedDayIndex, setSelectedDayIndex] = useState(3);

  const weekForecast = params.weekForecast ? JSON.parse(params.weekForecast) : [];
  
  const today = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getDayData = (offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return {
      fullDate: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`,
      shortDay: days[date.getDay()].slice(0, 3).toUpperCase(),
      date: date
    };
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => getDayData(i - 3));
  
  const weekData = weekDates.map((dateData, index) => ({
    day: dateData.fullDate,
    shortDay: dateData.shortDay,
    temp: index === 3 && weekForecast[0] ? weekForecast[0].temp : `${Math.floor(Math.random() * 5) + 24}°C`,
    wind: index === 3 && weekForecast[0] ? weekForecast[0].wind : '15 km/h',
    humidity: index === 3 && weekForecast[0] ? weekForecast[0].humidity : '60%',
    pressure: index === 3 && weekForecast[0] ? weekForecast[0].pressure : '1013 mb',
    visibility: index === 3 && weekForecast[0] ? weekForecast[0].visibility : '10 km',
    condition: index === 3 && weekForecast[0] ? weekForecast[0].condition : 'sunny',
    icon: index === 3 && weekForecast[0] ? weekForecast[0].icon : 'sunny-outline'
  }));

  const handleDaySelect = (index) => {
    setSelectedDayIndex(index);
  };

  return (
    <View className="flex-1 bg-[#E7F4EA]">
      <View className="p-4 flex-row items-center">
        {toggleSidebar && (
          <TouchableOpacity onPress={toggleSidebar} className="mr-4">
            <Ionicons name="menu-outline" size={24} color="#0B4D26" />
          </TouchableOpacity>
        )}
        <View className="flex-row items-center">
          <Ionicons name="partly-sunny-outline" size={24} color="#0B4D26" />
          <Text className="text-[#0B4D26] text-lg font-medium ml-2">
            Weather Forecast
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-3xl mx-4 p-6 shadow-sm">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-[#0B4D26] text-xl font-semibold mb-4">
              {weekData[selectedDayIndex].day}
            </Text>
            <View className="flex-row">
              <View className="mr-8">
                <Text className="text-[#0B4D26] mb-2">Wind</Text>
                <Text className="text-[#0B4D26] mb-2">Pressure</Text>
              </View>
              <View>
                <Text className="text-[#0B4D26] mb-2">{weekData[selectedDayIndex].wind}</Text>
                <Text className="text-[#0B4D26] mb-2">{weekData[selectedDayIndex].pressure}</Text>
              </View>
              <View className="ml-8">
                <Text className="text-[#0B4D26] mb-2">Humidity</Text>
                <Text className="text-[#0B4D26] mb-2">Visibility</Text>
              </View>
              <View className="ml-4">
                <Text className="text-[#0B4D26] mb-2">{weekData[selectedDayIndex].humidity}</Text>
                <Text className="text-[#0B4D26] mb-2">{weekData[selectedDayIndex].visibility}</Text>
              </View>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[#0B4D26] text-xl font-semibold">
              {weekData[selectedDayIndex].temp}
            </Text>
            <Ionicons
              name={weekData[selectedDayIndex].icon}
              size={24}
              color="#0B4D26"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </View>

      <Text className="text-[#0B4D26] text-2xl font-semibold px-4 mt-6">
        Next 7 Days
      </Text>

      <ScrollView className="flex-1 px-4 mt-6">
        {weekData.map((day, index) => index !== selectedDayIndex && (
          <View
            key={index}
            className="bg-[#D3E7D8] rounded-2xl p-4 mb-3 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <Ionicons name={day.icon} size={20} color="#0B4D26" />
              <Text className="text-[#0B4D26] ml-2 font-medium">
                {day.shortDay}
              </Text>
              <Text className="text-[#0B4D26] ml-2">
                {day.condition}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#0B4D26] mr-2">
                {day.temp}
              </Text>
              <TouchableOpacity onPress={() => handleDaySelect(index)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#0B4D26" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}