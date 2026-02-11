import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecommendCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export function RecommendCard({ title, value, icon, iconColor = '#34643F' }: RecommendCardProps) {
  return (
    <View className="bg-white rounded-xl p-4 flex-row border border-gray-200/80 shadow-sm">
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[#34643F] font-semibold text-sm">{title}</Text>
        <Text className="text-gray-800 text-sm mt-0.5">{value}</Text>
      </View>
    </View>
  );
}
