import { View, Text } from 'react-native';

export default function RecentActivity() {
    const activities = [
        { title: 'Crop planted', time: '2h ago' },
        { title: 'Water system checked', time: '4h ago' },
        { title: 'Soil analysis completed', time: '6h ago' },
    ];

    return (
        <View className="flex-1 bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-lg font-semibold mb-4">Recent Activity</Text>
            {activities.map((activity, index) => (
                <View key={index} className="flex-row justify-between items-center mb-3">
                    <Text className="text-gray-700">{activity.title}</Text>
                    <Text className="text-gray-500 text-sm">{activity.time}</Text>
                </View>
            ))}
        </View>
    );
}
