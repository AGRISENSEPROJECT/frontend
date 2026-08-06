import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { Slot } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import '../../global.css';
import { SidebarContext } from '../../context/SidebarContext';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ toggleSidebar }}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <Slot />
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        </View>
      </SafeAreaView>
    </SidebarContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
});
