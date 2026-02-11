import { View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Slot, useRouter, Stack, usePathname } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import '../../global.css';
import { SidebarContext } from '../../context/SidebarContext';

export default function MainLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Bottom navigation: Home | Community | Messages (tabs to navigate to community and more)
    const handleNavigation = (route: string) => {
        switch(route) {
            case 'home':
                router.push('/(main)/dashboard');
                break;
            case 'community':
                router.push('/(main)/community');
                break;
            case 'messages':
                router.push('/(main)/community?tab=messages');
                break;
            case 'profile':
                router.push('/(main)/settings');
                break;
            default:
                break;
        }
    };

    const showBottomNav = pathname === '/(main)/dashboard' || pathname === '/(main)/community';

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <SidebarContext.Provider value={{ toggleSidebar }}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <SafeAreaView className="flex-1 bg-white">
                {/* Main Content */}
                <View className="flex-1">
                    {/* Content Area */}
                    <View className="flex-1 bg-white">
                        <Slot />
                    </View>

                    {/* Bottom Navigation - Home | Community | Messages (navigate to community via tab) */}
                    {showBottomNav && (
                        <View className="flex-row justify-between items-center py-4 px-8 border-t border-gray-200 bg-white">
                            <TouchableOpacity onPress={() => handleNavigation('home')} className="items-center">
                                <Ionicons name="home-outline" size={26} color={pathname === '/(main)/dashboard' ? '#166534' : '#4B5563'} />
                                <Text className="text-xs mt-1" style={{ color: pathname === '/(main)/dashboard' ? '#166534' : '#4B5563' }}>Home</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('community')} className="items-center">
                                <Ionicons name="people-outline" size={26} color={pathname === '/(main)/community' ? '#166534' : '#4B5563'} />
                                <Text className="text-xs mt-1" style={{ color: pathname === '/(main)/community' ? '#166534' : '#4B5563' }}>Community</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('messages')} className="items-center">
                                <Ionicons name="chatbubble-outline" size={24} color="#4B5563" />
                                <Text className="text-xs mt-1 text-gray-500">Messages</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Sidebar Component */}
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </SafeAreaView>
        </SidebarContext.Provider>
    );
}
