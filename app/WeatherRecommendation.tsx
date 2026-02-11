import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecommendScreenHeader } from '@/components/RecommendScreenHeader';
import { RecommendCard } from '@/components/RecommendCard';

export default function WeatherRecommendation() {
  return (
    <View className="flex-1 bg-[#34643F]">
      <RecommendScreenHeader activeCategory="weather" />
      <View className="flex-1 bg-[#F8F8F0] rounded-t-3xl pt-6 px-4 pb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <View className="w-8 h-8 rounded-full bg-sky-100 items-center justify-center">
            <Ionicons name="partly-sunny" size={18} color="#0EA5E9" />
          </View>
          <Text className="text-[#34643F] text-lg font-bold">Weather Recommendations</Text>
        </View>
        <Text className="text-gray-500 text-sm mb-5">Get real-time weather insights for better farm decisions.</Text>

        <ScrollView showsVerticalScrollIndicator={false} className="gap-3">
          <RecommendCard
            title="Current Weather"
            value="Temperature: 28°C | Humidity: 65%"
            icon="sunny"
            iconColor="#EA580C"
          />
          <RecommendCard
            title="Rain Forecast"
            value="80% chance of rain tomorrow"
            icon="rainy"
            iconColor="#9CA3AF"
          />
          <RecommendCard
            title="Extreme Weather Alerts"
            value="Heavy storms expected in 3 days"
            icon="warning"
            iconColor="#EAB308"
          />
          <RecommendCard
            title="Recommended Actions"
            value="Less irrigation | Harvest rainwater"
            icon="checkmark-circle"
            iconColor="#22C55E"
          />
          <RecommendCard
            title="Historical Trends"
            value="Last Week: 27°C | 120mm Rain"
            icon="bar-chart"
            iconColor="#A855F7"
          />
        </ScrollView>
      </View>
    </View>
  );
}
