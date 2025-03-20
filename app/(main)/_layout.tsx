import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Slot, useRouter, Stack, usePathname } from 'expo-router';
import Sidebar from '../components/Sidebar';
import '../../global.css';
import { SidebarContext } from '../context/SidebarContext';

export default function MainLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Bottom navigation handler
    const handleNavigation = (route: string) => {
        switch(route) {
            case 'home':
                router.push('/(main)/dashboard');
                break;
            case 'profile':
                router.push('/(main)/settings');
                break;
            case 'chat':
                router.push('/(main)/community');
                break;
            default:
                break;
        }
    };

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

                    {/* Bottom Navigation - Only show on community page */}
                    {pathname === '/(main)/community' && (
                        <View className="flex-row justify-between py-4 px-8 border-t border-gray-200 bg-white">
                            <TouchableOpacity onPress={() => handleNavigation('home')}>
                                <Ionicons name="home-outline" size={24} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('profile')}>
                                <Ionicons name="person-outline" size={24} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('chat')}>
                                <Ionicons name="chatbubble-outline" size={24} color="#4B5563" />
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
