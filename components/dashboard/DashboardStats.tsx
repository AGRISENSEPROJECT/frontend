import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardStats() {
    const stats = [
        { icon: 'leaf', label: 'Total Crops', value: '1,234' },
        { icon: 'water', label: 'Water Usage', value: '2,345L' },
        { icon: 'sunny', label: 'Light Level', value: '75%' },
        { icon: 'thermometer', label: 'Temperature', value: '24°C' },
    ];

    return (
        <View className="flex-row flex-wrap -mx-2">
            {stats.map((stat, index) => (
                <View key={index} className="w-1/2 p-2">
                    <View className="bg-white p-4 rounded-lg shadow-sm">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-gray-600">{stat.label}</Text>
                            <Ionicons name={stat.icon as any} size={24} color="#0B4D26" />
                        </View>
                        <Text className="text-2xl font-bold mt-2">{stat.value}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}
