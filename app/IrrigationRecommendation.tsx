import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecommendScreenHeader } from '@/components/RecommendScreenHeader';
import { RecommendCard } from '@/components/RecommendCard';

export default function IrrigationRecommendation() {
  return (
    <View className="flex-1 bg-[#34643F]">
      <RecommendScreenHeader activeCategory="irrigation" />
      <View className="flex-1 bg-[#F8F8F0] rounded-t-3xl pt-6 px-4 pb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
            <Ionicons name="water" size={18} color="#0EA5E9" />
          </View>
          <Text className="text-[#34643F] text-lg font-bold">Irrigation Recommendation</Text>
        </View>
        <Text className="text-blue-700/80 text-sm mb-5">
          Monitor soil moisture, watering schedules, rainfall forecasts
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} className="gap-3">
          <RecommendCard
            title="Soil Moisture Level"
            value="Current Moisture: 40% (Needs watering)"
            icon="water"
            iconColor="#0EA5E9"
          />
          <RecommendCard
            title="Next Watering Schedule"
            value="Tomorrow, 6 AM | Amount: 20L per plant"
            icon="time"
            iconColor="#34643F"
          />
          <RecommendCard
            title="Rain Prediction"
            value="80% chance of rain - Delay watering"
            icon="rainy"
            iconColor="#0EA5E9"
          />
          <RecommendCard
            title="Water-Saving Tips"
            value="Use drip irrigation & mulching"
            icon="bulb"
            iconColor="#EAB308"
          />
          <RecommendCard
            title="Flood/Drought Alerts"
            value="▲ Drought Risk: High | Reduce irrigation loss"
            icon="warning"
            iconColor="#EAB308"
          />
        </ScrollView>
      </View>
    </View>
  );
}
