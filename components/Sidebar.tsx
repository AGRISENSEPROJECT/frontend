import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';
import { disconnectCommunitySocket } from '@/services/communitySocket';
import StatusModal from '@/components/ui/StatusModal';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 290);

const menuItems = [
  { icon: 'grid-outline', activeIcon: 'grid', label: 'Dashboard', route: '/(main)/dashboard', match: ['dashboard'] },
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
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUsername(userData.username || 'User');
          setProfileImage(userData.profileImage || null);
          return;
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const data = await authApi.getProfile(token);
          setUsername(data.user.username);
          setProfileImage(data.user.profileImage || null);
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
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
      disconnectCommunitySocket();
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

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Profile */}
        <View style={styles.profileSection}>
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
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#0B4D26" />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Menu</Text>

        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  router.push(item.route as any);
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  active && styles.menuItemActive,
                  pressed && !active && styles.menuItemPressed,
                ]}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={(active ? item.activeIcon : item.icon) as any}
                    size={20}
                    color={active ? '#fff' : '#0B4D26'}
                  />
                </View>
                <Text
                  style={[styles.menuText, active && styles.menuTextActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {active ? (
                  <Ionicons name="chevron-forward" size={16} color="#0B4D26" />
                ) : (
                  <View style={{ width: 16 }} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <Pressable style={styles.overlayClose} onPress={onClose} />

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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
  },
  sidebar: {
    height: '100%',
    backgroundColor: colors.surface,
    elevation: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  profileSection: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  greeting: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 18,
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  menuList: {
    paddingHorizontal: 12,
    width: '100%',
  },
  spacer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
  },
  menuItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#0B4D26',
  },
  menuItemPressed: {
    backgroundColor: '#E5E7EB',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapActive: {
    backgroundColor: '#0B4D26',
  },
  menuText: {
    flexGrow: 1,
    flexShrink: 1,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
  },
  menuTextActive: {
    color: '#0B4D26',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  logoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
  overlayClose: {
    flex: 1,
  },
});
