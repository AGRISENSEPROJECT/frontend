import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NotificationBell from '@/components/NotificationBell';

export type RecommendCategory = 'crop' | 'irrigation' | 'pest' | 'fertilizer' | 'weather';

const ROUTES: Record<RecommendCategory, string> = {
  crop: '/CropRecommendation',
  irrigation: '/IrrigationRecommendation',
  pest: '/PestDiseaseRecommendation',
  fertilizer: '/FertilizerRecommendation',
  weather: '/WeatherRecommendation',
};

const TABS: {
  key: RecommendCategory;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { key: 'crop', icon: 'leaf', label: 'Crop' },
  { key: 'irrigation', icon: 'water', label: 'Water' },
  { key: 'pest', icon: 'bug', label: 'Pests' },
  { key: 'fertilizer', icon: 'nutrition', label: 'Fertilizer' },
  { key: 'weather', icon: 'rainy', label: 'Weather' },
];

interface RecommendScreenHeaderProps {
  activeCategory: RecommendCategory;
}

export function RecommendScreenHeader({ activeCategory }: RecommendScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => router.replace('/(main)/dashboard')}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Recommends</Text>
        <NotificationBell color="#fff" size={24} />
      </View>

      <View style={styles.tabs}>
        {TABS.map(({ key, icon, label }) => {
          const isActive = activeCategory === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                if (isActive) return;
                router.push(ROUTES[key] as any);
              }}
              activeOpacity={0.88}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                <Ionicons
                  name={(isActive ? icon : `${icon}-outline`) as any}
                  size={18}
                  color={isActive ? '#0B4D26' : 'rgba(255,255,255,0.9)'}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0B4D26',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  iconBtn: { padding: 8, marginLeft: -8 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabIconActive: {
    backgroundColor: '#fff',
  },
  tabLabel: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '800',
  },
});
