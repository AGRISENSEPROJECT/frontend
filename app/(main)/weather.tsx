import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DaySelector from '../../components/weather/DaySelector';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSidebar } from '../../context/SidebarContext';
import NotificationBell from '@/components/NotificationBell';
import { WeatherSkeleton } from '@/components/ui/Skeleton';

const API_KEY = '4a681263221d7d234ffedd87dc199cab';

type HourItem = {
  time: string;
  temp: string;
  icon: string;
  isNow?: boolean;
};

type DayItem = {
  key: string;
  label: string;
  shortDay: string;
  temp: string;
  tempMin: string;
  condition: string;
  icon: string;
  humidity: string;
  wind: string;
};

function mapWeatherConditionToIcon(condition: string) {
  const conditionLower = condition.toLowerCase();
  const icons: Record<string, string> = {
    clear: 'sunny-outline',
    clouds: 'cloudy-outline',
    rain: 'rainy-outline',
    drizzle: 'rainy-outline',
    thunderstorm: 'thunderstorm-outline',
    snow: 'snow-outline',
    mist: 'cloudy-outline',
    fog: 'cloudy-outline',
  };
  return icons[conditionLower] || 'partly-sunny-outline';
}

export default function Weather() {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weatherData, setWeatherData] = useState({
    temp: '--°C',
    wind: '-- km/h',
    humidity: '--%',
    pressure: '-- mb',
    visibility: '-- km',
    condition: '--',
    location: 'Loading...',
  });
  const [hourlyForecast, setHourlyForecast] = useState<HourItem[]>([]);
  const [weekForecast, setWeekForecast] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lon: number | null }>({
    lat: null,
    lon: null,
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Permission to access location was denied');
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoordinates({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
      } catch (e: any) {
        console.error('Location error:', e);
        setError(`Location unavailable. Using Kigali fallback.`);
        setCoordinates({ lat: -1.9536, lon: 30.0605 });
      }
    })();
  }, []);

  const fetchWeatherData = useCallback(async () => {
    if (!coordinates.lat || !coordinates.lon) return;

    try {
      setLoading(true);
      setError(null);

      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${API_KEY}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${API_KEY}&units=metric`;

      const [currentResponse, forecastResponse] = await Promise.all([
        axios.get(currentWeatherUrl, { timeout: 10000 }),
        axios.get(forecastUrl, { timeout: 10000 }),
      ]);

      const currentData = currentResponse.data;
      const forecastData = forecastResponse.data.list as any[];

      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      const isToday = selectedDateStart.toDateString() === new Date().toDateString();

      let dayWeather: any;
      if (isToday) {
        dayWeather = currentData;
      } else {
        dayWeather =
          forecastData.find((item: any) => {
            const itemDate = new Date(item.dt * 1000);
            return itemDate >= selectedDateStart && itemDate <= selectedDateEnd;
          }) || forecastData[0];
      }

      setWeatherData({
        temp: `${Math.round(dayWeather.main.temp)}°C`,
        wind: `${(dayWeather.wind.speed * 3.6).toFixed(1)} km/h`,
        humidity: `${dayWeather.main.humidity}%`,
        pressure: `${dayWeather.main.pressure} mb`,
        visibility: `${((dayWeather.visibility ?? currentData.visibility ?? 10000) / 1000).toFixed(1)} km`,
        condition: dayWeather.weather[0].main.toLowerCase(),
        location: `${currentData.name}, ${currentData.sys.country}`,
      });

      const hourlyData: HourItem[] = forecastData
        .filter((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          return itemDate >= selectedDateStart && itemDate <= selectedDateEnd;
        })
        .map((item: any) => ({
          time: new Date(item.dt * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          temp: `${Math.round(item.main.temp)}°C`,
          icon: mapWeatherConditionToIcon(item.weather[0].main),
          isNow: isToday && new Date(item.dt * 1000).getHours() === new Date().getHours(),
        }));

      if (isToday) {
        hourlyData.unshift({
          time: 'Now',
          temp: `${Math.round(currentData.main.temp)}°C`,
          icon: mapWeatherConditionToIcon(currentData.weather[0].main),
          isNow: true,
        });
      }

      setHourlyForecast(hourlyData);

      // Build next ~5 days from 3-hourly forecast buckets
      const byDay = new Map<string, any[]>();
      for (const item of forecastData) {
        const d = new Date(item.dt * 1000);
        const key = d.toDateString();
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(item);
      }

      const days: DayItem[] = Array.from(byDay.entries())
        .slice(0, 6)
        .map(([key, items]) => {
          const mid = items[Math.floor(items.length / 2)] || items[0];
          const temps = items.map((i) => i.main.temp);
          const date = new Date(key);
          const isDayToday = key === new Date().toDateString();
          return {
            key,
            label: isDayToday
              ? 'Today'
              : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
            shortDay: isDayToday
              ? 'TODAY'
              : date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
            temp: `${Math.round(Math.max(...temps))}°`,
            tempMin: `${Math.round(Math.min(...temps))}°`,
            condition: mid.weather[0].description,
            icon: mapWeatherConditionToIcon(mid.weather[0].main),
            humidity: `${mid.main.humidity}%`,
            wind: `${(mid.wind.speed * 3.6).toFixed(0)} km/h`,
          };
        });

      setWeekForecast(days);
    } catch (err: any) {
      console.error('Failed to fetch weather data:', err);
      setError(err?.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [coordinates.lat, coordinates.lon, selectedDate]);

  useEffect(() => {
    if (coordinates.lat && coordinates.lon) {
      fetchWeatherData();
    }
  }, [coordinates, selectedDate, fetchWeatherData]);

  const openDayForecast = (dayKey?: string) => {
    router.push({
      pathname: '/(main)/forecast',
      params: {
        lat: String(coordinates.lat),
        lon: String(coordinates.lon),
        location: weatherData.location,
        focusDay: dayKey || selectedDate.toDateString(),
      },
    });
  };

  if (loading && !coordinates.lat) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { minHeight: 72, justifyContent: 'flex-end', paddingBottom: 12 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
              <Ionicons name="menu-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.locationText}>Weather</Text>
            <NotificationBell color="#fff" size={24} />
          </View>
        </View>
        <WeatherSkeleton />
        <Text style={[styles.loadingText, { textAlign: 'center' }]}>Getting your location...</Text>
      </View>
    );
  }

  if (error && !weatherData.location.includes(',')) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="cloud-offline-outline" size={42} color="#0B4D26" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchWeatherData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.locationWrap}>
            <Ionicons name="location" size={15} color="#BBF7D0" />
            <Text style={styles.locationText} numberOfLines={1}>
              {weatherData.location}
            </Text>
          </View>
          <NotificationBell color="#fff" size={24} />
        </View>

        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>
              {selectedDate.toDateString() === new Date().toDateString()
                ? 'Right now'
                : selectedDate.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
            </Text>
            <Text style={styles.heroTemp}>{weatherData.temp}</Text>
            <Text style={styles.heroCondition}>{weatherData.condition}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons
              name={mapWeatherConditionToIcon(weatherData.condition) as any}
              size={44}
              color="#0B4D26"
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose day</Text>
          <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </View>

        <View style={styles.metricsGrid}>
          <WeatherMetric icon="water-outline" label="Humidity" value={weatherData.humidity} />
          <WeatherMetric icon="navigate-outline" label="Wind" value={weatherData.wind} />
          <WeatherMetric icon="speedometer-outline" label="Pressure" value={weatherData.pressure} />
          <WeatherMetric icon="eye-outline" label="Visibility" value={weatherData.visibility} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>
              Hourly
            </Text>
            <Text style={styles.sectionHint}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 64,
                    height: 88,
                    borderRadius: 14,
                    backgroundColor: '#D6DED8',
                  }}
                />
              ))}
            </View>
          ) : hourlyForecast.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyList}
            >
              {hourlyForecast.map((hour, index) => (
                <View
                  key={`${hour.time}-${index}`}
                  style={[styles.hourCard, hour.isNow && styles.hourCardActive]}
                >
                  <Text style={[styles.hourTime, hour.isNow && styles.hourTextActive]}>
                    {hour.time}
                  </Text>
                  <Ionicons
                    name={hour.icon as any}
                    size={26}
                    color={hour.isNow ? '#fff' : '#0B4D26'}
                  />
                  <Text style={[styles.hourTemp, hour.isNow && styles.hourTextActive]}>
                    {hour.temp}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hourly forecast for this day.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>
              Next days
            </Text>
            <TouchableOpacity onPress={() => openDayForecast()} hitSlop={8}>
              <Text style={styles.sectionHint}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekList}>
            {weekForecast.map((day) => {
              const selected = day.key === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={day.key}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedDate(new Date(day.key));
                  }}
                  onLongPress={() => openDayForecast(day.key)}
                  style={[styles.weekRow, selected && styles.weekRowActive]}
                >
                  <View style={[styles.weekIcon, selected && styles.weekIconActive]}>
                    <Ionicons
                      name={day.icon as any}
                      size={18}
                      color={selected ? '#fff' : '#0B4D26'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.weekDay, selected && styles.weekTextActive]}>
                      {day.shortDay}
                    </Text>
                    <Text
                      style={[styles.weekCondition, selected && styles.weekSubActive]}
                      numberOfLines={1}
                    >
                      {day.condition}
                    </Text>
                  </View>
                  <Text style={[styles.weekTemp, selected && styles.weekTextActive]}>
                    {day.tempMin}
                    <Text style={{ fontWeight: '600', opacity: 0.7 }}> / </Text>
                    {day.temp}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => openDayForecast()}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Open full forecast</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function WeatherMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color="#0B4D26" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F2' },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F4F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#0B4D26', marginTop: 10, fontWeight: '700' },
  errorText: {
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#0B4D26',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  header: {
    backgroundColor: '#0B4D26',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  locationText: { color: '#fff', fontWeight: '800', fontSize: 14, maxWidth: 180 },
  heroCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroLabel: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  heroTemp: { color: '#0B4D26', fontSize: 52, fontWeight: '300', marginTop: 2 },
  heroCondition: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHint: { color: '#0B4D26', fontSize: 12, fontWeight: '800' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    rowGap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  metricValue: { color: '#111827', fontSize: 15, fontWeight: '800', marginTop: 1 },
  hourlyList: { paddingHorizontal: 16, gap: 10 },
  hourCard: {
    width: 76,
    height: 110,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hourCardActive: { backgroundColor: '#0B4D26', borderColor: '#0B4D26' },
  hourTime: { color: '#0B4D26', fontSize: 12, fontWeight: '800' },
  hourTemp: { color: '#111827', fontSize: 15, fontWeight: '800' },
  hourTextActive: { color: '#fff' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  weekList: { paddingHorizontal: 16, gap: 8 },
  weekRow: {
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
  weekRowActive: {
    backgroundColor: '#0B4D26',
    borderColor: '#0B4D26',
  },
  weekIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  weekDay: { color: '#111827', fontWeight: '800', fontSize: 13 },
  weekCondition: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 1,
  },
  weekTemp: { color: '#0B4D26', fontWeight: '800', fontSize: 15 },
  weekTextActive: { color: '#fff' },
  weekSubActive: { color: 'rgba(255,255,255,0.8)' },
  primaryButton: {
    backgroundColor: '#0B4D26',
    borderRadius: 16,
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 22,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
