import { View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Slot, useRouter, usePathname } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import '../../global.css';
import { SidebarContext } from '../../context/SidebarContext';

export default function MainLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigation = (route: string) => {
        switch (route) {
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

    // expo-router pathnames drop the group segment: "/dashboard", not "/(main)/dashboard"
    const isHome = pathname === '/dashboard' || pathname.endsWith('/dashboard');
    const isCommunity = pathname === '/community' || pathname.endsWith('/community');
    const showBottomNav = isHome || isCommunity;

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <SidebarContext.Provider value={{ toggleSidebar }}>
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1">
                    <View className="flex-1 bg-white">
                        <Slot />
                    </View>

                    {showBottomNav && (
                        <View className="flex-row justify-between items-center py-4 px-8 border-t border-gray-200 bg-white">
                            <TouchableOpacity onPress={() => handleNavigation('home')} className="items-center">
                                <Ionicons name="home-outline" size={26} color={isHome ? '#166534' : '#4B5563'} />
                                <Text className="text-xs mt-1" style={{ color: isHome ? '#166534' : '#4B5563' }}>Home</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('community')} className="items-center">
                                <Ionicons name="people-outline" size={26} color={isCommunity ? '#166534' : '#4B5563'} />
                                <Text className="text-xs mt-1" style={{ color: isCommunity ? '#166534' : '#4B5563' }}>Community</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleNavigation('messages')} className="items-center">
                                <Ionicons name="chatbubble-outline" size={24} color="#4B5563" />
                                <Text className="text-xs mt-1 text-gray-500">Messages</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </SafeAreaView>
        </SidebarContext.Provider>
    );
}
