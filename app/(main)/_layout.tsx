import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Slot } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import '../../global.css';
import { SidebarContext } from '../../context/SidebarContext';

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <SidebarContext.Provider value={{ toggleSidebar }}>
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 bg-white">
                    <Slot />
                </View>
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </SafeAreaView>
        </SidebarContext.Provider>
    );
}
