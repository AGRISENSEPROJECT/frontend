import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NotificationBell from '@/components/NotificationBell';

export type RecommendCategory = 'crop' | 'irrigation' | 'pest' | 'fertilizer' | 'weather';

const ROUTES: Record<RecommendCategory, string> = {
  crop: '/CropRecommendation',
  irrigation: '/IrrigationRecommendation',
  pest: '/PestDiseaseRecommendation',
  fertilizer: '/FertilizerRecommendation',
  weather: '/WeatherRecommendation',
};

const TABS: { key: RecommendCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'crop', icon: 'leaf' },
  { key: 'irrigation', icon: 'water' },
  { key: 'pest', icon: 'bug' },
  { key: 'fertilizer', icon: 'nutrition' },
  { key: 'weather', icon: 'rainy' },
];

interface RecommendScreenHeaderProps {
  activeCategory: RecommendCategory;
}

export function RecommendScreenHeader({ activeCategory }: RecommendScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="bg-[#34643F] pt-12 pb-0 px-4">
      <View className="flex-row justify-between items-center pb-3">
        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Recommends</Text>
        <NotificationBell color="#fff" size={24} />
      </View>
      {/* Lighter green category bar */}
      <View className="bg-[#4A7C59] flex-row justify-center items-center gap-3 py-3 rounded-t-2xl">
        {TABS.map(({ key, icon }) => {
          const isActive = activeCategory === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                if (isActive) return;
                router.push(ROUTES[key] as any);
              }}
              className={`w-10 h-10 rounded-full items-center justify-center ${isActive ? 'bg-[#34643F]' : 'bg-white/10'}`}
            >
              <Ionicons
                name={isActive ? icon : `${icon}-outline` as any}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
