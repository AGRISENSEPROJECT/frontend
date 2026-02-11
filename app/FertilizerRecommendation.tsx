import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecommendScreenHeader } from '@/components/RecommendScreenHeader';
import { RecommendCard } from '@/components/RecommendCard';

export default function FertilizerRecommendation() {
  return (
    <View className="flex-1 bg-[#34643F]">
      <RecommendScreenHeader activeCategory="fertilizer" />
      <View className="flex-1 bg-[#F8F8F0] rounded-t-3xl pt-6 px-4 pb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
            <Ionicons name="leaf" size={18} color="#B45309" />
          </View>
          <Text className="text-[#34643F] text-lg font-bold">Fertilizer Recommendations</Text>
        </View>
        <Text className="text-gray-500 text-sm mb-5">Optimize soil nutrients for better yields.</Text>

        <ScrollView showsVerticalScrollIndicator={false} className="gap-3">
          <RecommendCard
            title="Soil pH Level"
            value="pH: 6.2 (Slightly Acidic)"
            icon="checkmark-circle"
            iconColor="#22C55E"
          />
          <RecommendCard
            title="Soil Nutrients"
            value="N: Low | P: Medium | K: High"
            icon="leaf"
            iconColor="#34643F"
          />
          <RecommendCard
            title="Recommended Fertilizer"
            value="NPK 20-10-10 | 50kg per acre"
            icon="bag"
            iconColor="#34643F"
          />
          <RecommendCard
            title="Organic Alternatives"
            value="Compost | Manure | Bone Meal"
            icon="leaf"
            iconColor="#34643F"
          />
          <RecommendCard
            title="Soil Improvement Tips"
            value="Cover crops | Mulching"
            icon="flower"
            iconColor="#EA580C"
          />
        </ScrollView>
      </View>
    </View>
  );
}
