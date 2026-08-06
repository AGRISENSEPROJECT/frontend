import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

const menuItems = [
  { icon: 'grid-outline', activeIcon: 'grid', label: 'Dashboard', route: '/(main)/dashboard', match: ['dashboard', '(main)/dashboard'] },
  { icon: 'add-circle-outline', activeIcon: 'add-circle', label: 'Register Farm', route: '/RegisterFarm', match: ['RegisterFarm'] },
  { icon: 'leaf-outline', activeIcon: 'leaf', label: 'Recommends', route: '/recommends', match: ['recommends', 'CropRecommendation', 'IrrigationRecommendation', 'PestDiseaseRecommendation', 'FertilizerRecommendation', 'WeatherRecommendation'] },
  { icon: 'cloudy-outline', activeIcon: 'cloudy', label: 'Weather', route: '/(main)/weather', match: ['weather', 'forecast'] },
  { icon: 'people-outline', activeIcon: 'people', label: 'Community', route: '/(main)/community', match: ['community', 'CommunityChat'] },
  { icon: 'settings-outline', activeIcon: 'settings', label: 'Settings', route: '/(main)/settings', match: ['settings'] },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [visible, setVisible] = useState(isOpen);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [isOpen, visible, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUsername(userData.username || 'User');
          setProfileImage(userData.profileImage || null);
        } else {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            const data = await authApi.getProfile(token);
            setUsername(data.user.username);
            setProfileImage(data.user.profileImage || null);
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data', error);
      }
    })();
  }, [isOpen]);

  const isActive = (item: (typeof menuItems)[number]) =>
    item.match.some((m) => pathname?.includes(m));

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (token && refreshToken) {
        try {
          await authApi.logout(token, refreshToken);
        } catch (e) {
          console.error('Backend logout failed:', e);
        }
      }

      await AsyncStorage.multiRemove([
        'token',
        'refreshToken',
        'user',
        'skipFarm',
        'preferredFarmId',
      ]);
      onClose();
      router.replace('/signin');
    } catch {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Logout Failed',
        message: 'Failed to logout. Please try again.',
      });
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          { width: SIDEBAR_WIDTH, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left']}>
          <View style={styles.profileCard}>
            <View style={styles.profileGlow} />
            <View style={styles.profileRow}>
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    : require('../assets/profile-pic.png')
                }
                style={styles.profilePic}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.greeting}>Good day</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {username || 'Farmer'}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.brandMark}>Agrisense</Text>
          </View>

          <ScrollView
            style={styles.menuContainer}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.menuLabel}>Navigate</Text>
            {menuItems.map((item) => {
              const active = isActive(item);
              return (
                <Pressable
                  key={item.route}
                  onPress={() => {
                    router.push(item.route as any);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    active && styles.menuItemActive,
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
                    <Ionicons
                      name={(active ? item.activeIcon : item.icon) as any}
                      size={20}
                      color={active ? '#0B4D26' : '#4B5563'}
                    />
                  </View>
                  <Text style={[styles.menuText, active && styles.menuTextActive]}>
                    {item.label}
                  </Text>
                  {active && <View style={styles.activeDot} />}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FAFAF7',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 16,
  },
  safe: {
    flex: 1,
  },
  profileCard: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 22,
    backgroundColor: '#0B4D26',
    padding: 16,
    overflow: 'hidden',
  },
  profileGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    marginTop: 14,
    color: '#BBF7D0',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 20,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: '#E8F5E9',
  },
  menuItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapActive: {
    backgroundColor: '#fff',
  },
  menuText: {
    flex: 1,
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  menuTextActive: {
    color: '#0B4D26',
    fontWeight: '800',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    gap: 12,
  },
  logoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
});
