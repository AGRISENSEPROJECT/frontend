import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecommendScreenHeader } from '@/components/RecommendScreenHeader';
import { RecommendCard } from '@/components/RecommendCard';

export default function PestDiseaseRecommendation() {
  return (
    <View className="flex-1 bg-[#34643F]">
      <RecommendScreenHeader activeCategory="pest" />
      <View className="flex-1 bg-[#F8F8F0] rounded-t-3xl pt-6 px-4 pb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <View className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <Text className="text-[#34643F] text-lg font-bold">Pest & Disease Recommendations</Text>
        </View>
        <Text className="text-gray-500 text-sm mb-5">Detect issues early and protect your crops.</Text>

        <ScrollView showsVerticalScrollIndicator={false} className="gap-3">
          <RecommendCard
            title="Detected Issue"
            value="Leaf Rust (Wheat)"
            icon="warning"
            iconColor="#EAB308"
          />
          <RecommendCard
            title="Symptoms"
            value="Yellowish-brown patches on leaves"
            icon="bug"
            iconColor="#92400E"
          />
          <RecommendCard
            title="Recommended Treatment"
            value="Neem Oil Spray | Copper Fungicide"
            icon="leaf"
            iconColor="#34643F"
          />
          <RecommendCard
            title="Preventive Measures"
            value="Crop rotation | Intercropping"
            icon="checkmark-done-circle"
            iconColor="#22C55E"
          />
          <RecommendCard
            title="Spraying Schedule"
            value="Best Time: Early Morning or Late Evening"
            icon="time-outline"
            iconColor="#9CA3AF"
          />
        </ScrollView>
      </View>
    </View>
  );
}
