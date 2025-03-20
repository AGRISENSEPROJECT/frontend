import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WeatherWidget() {
    return (
        <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
            <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold">Weather</Text>
                <Ionicons name="partly-sunny" size={24} color="#0B4D26" />
            </View>
            <View className="mt-4">
                <Text className="text-3xl font-bold">24°C</Text>
                <Text className="text-gray-600">Partly Cloudy</Text>
                <Text className="text-gray-500 mt-2">Humidity: 65%</Text>
                <Text className="text-gray-500">Wind: 5 km/h</Text>
            </View>
        </View>
    );
}
