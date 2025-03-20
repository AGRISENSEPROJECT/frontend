import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Sidebar() {
    const router = useRouter();
    const user = {
        name: 'Nelson IRABUBIZA',
        image: null // Placeholder for user image
    };

    const menuItems = [
        { icon: 'grid-outline', label: 'Dashboard', route: '/dashboard' },
        { icon: 'analytics-outline', label: 'Analytics', route: '/dashboard/analytics' },
        { icon: 'leaf-outline', label: 'Harvest', route: '/dashboard/harvest' },
        { icon: 'calendar-outline', label: 'Schedule', route: '/dashboard/schedule' },
        { icon: 'bulb-outline', label: 'Recommends', route: '/dashboard/recommends' },
        { icon: 'cloud-outline', label: 'Weather', route: '/dashboard/weather' },
        { icon: 'flask-outline', label: 'Soil detects', route: '/dashboard/soil' },
        { icon: 'people-outline', label: 'Community', route: '/dashboard/community' },
    ];

    return (
        <View className="w-64 bg-white border-r border-gray-200 h-full shadow-lg">
            <View className="p-4 border-b border-gray-200">
                <View className="flex-row items-center space-x-3">
                    {user.image ? (
                        <Image
                            source={{ uri: user.image }}
                            className="w-10 h-10 rounded-full"
                        />
                    ) : (
                        <View className="w-10 h-10 rounded-full bg-[#0B4D26] items-center justify-center">
                            <Text className="text-white text-lg">{user.name.charAt(0)}</Text>
                        </View>
                    )}
                    <View>
                        <Text className="text-sm text-gray-500">Good Day 👋</Text>
                        <Text className="font-semibold">{user.name}</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 pt-4">
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className={`flex-row items-center space-x-3 px-4 py-3 mx-2 rounded-lg
                            ${item.label === 'Community' ? 'bg-[#0B4D26]' : ''}`}
                        onPress={() => router.push(item.route)}
                    >
                        <Ionicons
                            name={item.icon as any}
                            size={24}
                            color={item.label === 'Community' ? 'white' : '#4B5563'}
                        />
                        <Text className={item.label === 'Community' ? 'text-white' : 'text-gray-600'}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View className="p-4 border-t border-gray-200">
                <TouchableOpacity className="flex-row items-center space-x-3 px-4 py-3">
                    <Ionicons name="settings-outline" size={24} color="#4B5563" />
                    <Text className="text-gray-600">Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center space-x-3 px-4 py-3"
                    onPress={() => router.push('/')}
                >
                    <MaterialCommunityIcons name="logout" size={24} color="#4B5563" />
                    <Text className="text-gray-600">Go back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
