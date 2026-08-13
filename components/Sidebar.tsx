import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';
import { disconnectCommunitySocket } from '@/services/communitySocket';
import StatusModal from '@/components/ui/StatusModal';
import { clearSession } from '@/utils/session';
import { useSidebar } from '@/context/SidebarContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.82), 300);

const menuItems = [
  { icon: 'grid-outline', activeIcon: 'grid', label: 'Dashboard', route: '/(main)/dashboard', match: ['dashboard'] },
  { icon: 'add-circle-outline', activeIcon: 'add-circle', label: 'Register Farm', route: '/RegisterFarm', match: ['RegisterFarm'] },
  { icon: 'leaf-outline', activeIcon: 'leaf', label: 'Recommends', route: '/recommends', match: ['recommends', 'CropRecommendation', 'IrrigationRecommendation', 'PestDiseaseRecommendation', 'FertilizerRecommendation', 'WeatherRecommendation'] },
  { icon: 'cloudy-outline', activeIcon: 'cloudy', label: 'Weather', route: '/(main)/weather', match: ['weather', 'forecast'] },
  { icon: 'people-outline', activeIcon: 'people', label: 'Community', route: '/(main)/community', match: ['community', 'CommunityChat'] },
  { icon: 'notifications-outline', activeIcon: 'notifications', label: 'Notifications', route: '/Notifications', match: ['Notifications'] },
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
  const { profile, refreshProfile, applyUser } = useSidebar();
  const displayName = profile.displayName;
  const profileImage = profile.profileImage;
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    refreshProfile();
  }, [isOpen, refreshProfile]);

  const isActive = (item: (typeof menuItems)[number]) =>
    item.match.some((m) => pathname?.includes(m));

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (token) {
        try {
          await authApi.logout(token, refreshToken || '');
        } catch (e) {
          console.error('Backend logout failed:', e);
        }
      }
      await clearSession();
      await applyUser(null);
      disconnectCommunitySocket();
      onClose();
      // Drop authenticated screens so hardware/back can't reopen the dashboard.
      if (typeof router.dismissAll === 'function') {
        router.dismissAll();
      }
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
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
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
              {displayName || 'Farmer'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#0B4D26" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>MENU</Text>

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.75}
                onPress={() => {
                  onClose();
                  router.push(item.route as any);
                }}
                style={[styles.menuItem, active && styles.menuItemActive]}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={(active ? item.activeIcon : item.icon) as any}
                    size={20}
                    color={active ? '#FFFFFF' : '#0B4D26'}
                  />
                </View>
                {/* View wrapper avoids Android flex-on-Text bugs that hid labels */}
                <View style={styles.menuLabelWrap}>
                  <Text
                    style={[styles.menuText, active ? styles.menuTextActive : null]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="chevron-forward" size={16} color="#0B4D26" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={styles.logoutButton}
        >
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </View>
          <View style={styles.menuLabelWrap}>
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.overlayClose} onPress={onClose} activeOpacity={1} />

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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flexDirection: 'row',
  },
  sidebar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 24,
  },
  profileSection: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#0B4D26',
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
    minWidth: 0,
  },
  greeting: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 8,
    marginLeft: 18,
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  menuScroll: {
    flex: 1,
  },
  menuList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  menuItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#0B4D26',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapActive: {
    backgroundColor: '#0B4D26',
  },
  menuLabelWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 80,
    paddingRight: 8,
  },
  menuText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  menuTextActive: {
    color: '#0B4D26',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 4,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  logoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
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
