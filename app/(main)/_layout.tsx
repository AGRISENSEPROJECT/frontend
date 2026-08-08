import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Main tab shell — sidebar lives at the root so every screen can open it. */
export default function MainLayout() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!mounted) return;
      if (!token) router.replace('/signin');
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
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
