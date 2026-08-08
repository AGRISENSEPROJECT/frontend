import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { SidebarContext } from '../../context/SidebarContext';

const API_KEY = '4a681263221d7d234ffedd87dc199cab';

type DayForecast = {
  key: string;
  label: string;
  shortDay: string;
  temp: string;
  tempMin: string;
  wind: string;
  humidity: string;
  pressure: string;
  visibility: string;
  condition: string;
  icon: string;
};

function mapIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'thunderstorm-outline';
  if (c.includes('rain') || c.includes('drizzle')) return 'rainy-outline';
  if (c.includes('snow')) return 'snow-outline';
  if (c.includes('cloud')) return 'cloudy-outline';
  if (c.includes('clear')) return 'sunny-outline';
  return 'partly-sunny-outline';
}

export default function Forecast() {
  const router = useRouter();
  const { toggleSidebar } = useContext(SidebarContext) || {};
  const params = useLocalSearchParams<{
    lat?: string;
    lon?: string;
    location?: string;
    focusDay?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(params.location || 'Forecast');
  const [days, setDays] = useState<DayForecast[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const lat = params.lat ? Number(params.lat) : -1.9536;
        const lon = params.lon ? Number(params.lon) : 30.0605;

        const [currentRes, forecastRes] = await Promise.all([
          axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
            { timeout: 10000 },
          ),
          axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
            { timeout: 10000 },
          ),
        ]);

        setLocation(`${currentRes.data.name}, ${currentRes.data.sys.country}`);

        const byDay = new Map<string, any[]>();
        for (const item of forecastRes.data.list as any[]) {
          const key = new Date(item.dt * 1000).toDateString();
          if (!byDay.has(key)) byDay.set(key, []);
          byDay.get(key)!.push(item);
        }

        // Ensure today exists using current weather
        const todayKey = new Date().toDateString();
        if (!byDay.has(todayKey)) {
          byDay.set(todayKey, [
            {
              dt: Math.floor(Date.now() / 1000),
              main: currentRes.data.main,
              wind: currentRes.data.wind,
              visibility: currentRes.data.visibility,
              weather: currentRes.data.weather,
            },
          ]);
        }

        const built: DayForecast[] = Array.from(byDay.entries())
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .slice(0, 7)
          .map(([key, items]) => {
            const mid = items[Math.floor(items.length / 2)] || items[0];
            const temps = items.map((i) => i.main.temp as number);
            const date = new Date(key);
            const isToday = key === todayKey;
            return {
              key,
              label: isToday
                ? `Today · ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
                : date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }),
              shortDay: isToday
                ? 'TODAY'
                : date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
              temp: `${Math.round(Math.max(...temps))}°C`,
              tempMin: `${Math.round(Math.min(...temps))}°C`,
              wind: `${((mid.wind?.speed || 0) * 3.6).toFixed(1)} km/h`,
              humidity: `${mid.main.humidity}%`,
              pressure: `${mid.main.pressure} mb`,
              visibility: `${((mid.visibility ?? currentRes.data.visibility ?? 10000) / 1000).toFixed(1)} km`,
              condition: mid.weather[0].description,
              icon: mapIcon(mid.weather[0].main),
            };
          });

        setDays(built);
        const focus = typeof params.focusDay === 'string' ? params.focusDay : todayKey;
        const idx = built.findIndex((d) => d.key === focus);
        setSelectedIndex(idx >= 0 ? idx : 0);
      } catch (e: any) {
        setError(e?.message || 'Could not load forecast');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.lat, params.lon, params.focusDay]);

  const selected = days[selectedIndex];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (toggleSidebar ? toggleSidebar() : router.back())}
          style={styles.iconBtn}
        >
          <Ionicons name={toggleSidebar ? 'menu-outline' : 'arrow-back'} size={24} color="#0B4D26" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="partly-sunny-outline" size={20} color="#0B4D26" />
          <Text style={styles.headerTitle}>Weather Forecast</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color="#0B4D26" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0B4D26" />
        </View>
      ) : error || !selected ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'No forecast data'}</Text>
          <TouchableOpacity onPress={() => router.replace('/(main)/weather')} style={styles.retry}>
            <Text style={styles.retryText}>Back to Weather</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.location}>{location}</Text>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroDate}>{selected.label}</Text>
                <Text style={styles.heroTemp}>{selected.temp}</Text>
                <Text style={styles.heroCondition}>{selected.condition}</Text>
                <Text style={styles.heroRange}>
                  Low {selected.tempMin} · High {selected.temp}
                </Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name={selected.icon as any} size={40} color="#0B4D26" />
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric label="Wind" value={selected.wind} />
              <Metric label="Humidity" value={selected.humidity} />
              <Metric label="Pressure" value={selected.pressure} />
              <Metric label="Visibility" value={selected.visibility} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Next 7 Days</Text>
          <View style={styles.list}>
            {days.map((day, index) => {
              const active = index === selectedIndex;
              return (
                <TouchableOpacity
                  key={day.key}
                  activeOpacity={0.88}
                  onPress={() => setSelectedIndex(index)}
                  style={[styles.dayRow, active && styles.dayRowActive]}
                >
                  <View style={[styles.dayIcon, active && styles.dayIconActive]}>
                    <Ionicons
                      name={day.icon as any}
                      size={18}
                      color={active ? '#fff' : '#0B4D26'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayName, active && styles.dayTextActive]}>
                      {day.shortDay}
                    </Text>
                    <Text
                      style={[styles.dayCondition, active && styles.daySubActive]}
                      numberOfLines={1}
                    >
                      {day.condition}
                    </Text>
                  </View>
                  <Text style={[styles.dayTemp, active && styles.dayTextActive]}>
                    {day.tempMin.replace('°C', '°')} / {day.temp.replace('°C', '°')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#0B4D26', fontSize: 17, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#374151', fontWeight: '600', textAlign: 'center' },
  retry: {
    marginTop: 14,
    backgroundColor: '#0B4D26',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  location: {
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 10,
  },
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroDate: { color: '#0B4D26', fontSize: 15, fontWeight: '800' },
  heroTemp: { color: '#111827', fontSize: 42, fontWeight: '300', marginTop: 4 },
  heroCondition: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  heroRange: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', marginTop: 6 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: { width: '50%', paddingVertical: 8 },
  metricLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  metricValue: { color: '#111827', fontSize: 15, fontWeight: '800', marginTop: 2 },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  list: { paddingHorizontal: 16, gap: 8 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dayRowActive: {
    backgroundColor: '#0B4D26',
    borderColor: '#0B4D26',
  },
  dayIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  dayName: { color: '#111827', fontWeight: '800', fontSize: 13 },
  dayCondition: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 1,
  },
  dayTemp: { color: '#0B4D26', fontWeight: '800', fontSize: 14 },
  dayTextActive: { color: '#fff' },
  daySubActive: { color: 'rgba(255,255,255,0.8)' },
});
