import { View, TouchableOpacity, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DaySelector from '../../components/weather/DaySelector';
import { useRouter } from 'expo-router';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSidebar } from '../../context/SidebarContext';

const API_KEY = '4a681263221d7d234ffedd87dc199cab';

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
    const [hourlyForecast, setHourlyForecast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [coordinates, setCoordinates] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null });

    // Load fonts
    useEffect(() => {
        async function loadFonts() {
            try {
                await Font.loadAsync(Ionicons.font);
                setFontsLoaded(true);
            } catch (e) {
                console.error('Font loading error:', e);
            }
        }
        loadFonts();
    }, []);

    // Get user's location with better error handling
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    throw new Error('Permission to access location was denied');
                }

                let location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                console.log('Location obtained:', location.coords); // Debug log

                setCoordinates({
                    lat: location.coords.latitude,
                    lon: location.coords.longitude,
                });
            } catch (e: any) {
                console.error('Location error:', e);
                setError(`Failed to get location: ${e?.message || 'Unknown error'}. Using fallback location.`);
                // Fallback to Kigali coordinates
                setCoordinates({ lat: -1.9536, lon: 30.0605 });
            }
        })();
    }, []);

    // Fetch weather data based on selected date
    const fetchWeatherData = async () => {
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
            const forecastData = forecastResponse.data.list;

            // Filter forecast data based on selected date
            const selectedDateStart = new Date(selectedDate);
            selectedDateStart.setHours(0, 0, 0, 0);
            const selectedDateEnd = new Date(selectedDate);
            selectedDateEnd.setHours(23, 59, 59, 999);

            const isToday = selectedDateStart.toDateString() === new Date().toDateString();
            let dayWeather;

            if (isToday) {
                dayWeather = currentData;
            } else {
                const forecastForDay = forecastData.find((item: any) => {
                    const itemDate = new Date(item.dt * 1000);
                    return itemDate >= selectedDateStart && itemDate <= selectedDateEnd;
                }) || forecastData[0]; // Fallback to first forecast if no match
                dayWeather = forecastForDay;
            }

            setWeatherData({
                temp: `${Math.round(dayWeather.main.temp)}°C`,
                wind: `${(dayWeather.wind.speed * 3.6).toFixed(1)} km/h`,
                humidity: `${dayWeather.main.humidity}%`,
                pressure: `${dayWeather.main.pressure} mb`,
                visibility: `${(dayWeather.visibility / 1000).toFixed(1)} km`,
                condition: dayWeather.weather[0].main.toLowerCase(),
                location: `${currentData.name}, ${currentData.sys.country}`,
            });

            // Filter hourly forecast for selected day
            const hourlyData = forecastData
                .filter((item: any) => {
                    const itemDate = new Date(item.dt * 1000);
                    return itemDate >= selectedDateStart && itemDate <= selectedDateEnd;
                })
                .map((item: any) => ({
                    time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temp: `${Math.round(item.main.temp)}°C`,
                    icon: mapWeatherConditionToIcon(item.weather[0].main),
                    isNow: isToday && new Date(item.dt * 1000).getHours() === new Date().getHours(),
                }));

            // If it's today, add current weather as first hourly entry
            if (isToday) {
                hourlyData.unshift({
                    time: 'Now',
                    temp: `${Math.round(currentData.main.temp)}°C`,
                    icon: mapWeatherConditionToIcon(currentData.weather[0].main),
                    isNow: true,
                });
            }

            setHourlyForecast(hourlyData);
        } catch (error: any) {
            console.error('Failed to fetch weather data:', error);
            setError(error?.message || 'Failed to fetch weather data');
        } finally {
            setLoading(false);
        }
    };

    const mapWeatherConditionToIcon = (condition: string) => {
        const conditionLower = condition.toLowerCase();
        const icons: { [key: string]: string } = {
            clear: 'sunny-outline',
            clouds: 'cloudy-outline',
            rain: 'rainy-outline',
            thunderstorm: 'thunderstorm-outline',
            snow: 'snow-outline',
        };
        return icons[conditionLower] || 'partly-sunny-outline';
    };

    useEffect(() => {
        if (fontsLoaded && coordinates.lat && coordinates.lon) {
            fetchWeatherData();
        }
    }, [fontsLoaded, coordinates, selectedDate]);

    const handleDateChange = (newDate: Date) => {
        setSelectedDate(newDate);
    };

    const handleGetRecommended = () => {
        const weekForecast = JSON.stringify([{
            day: 'Today',
            ...weatherData,
            icon: mapWeatherConditionToIcon(weatherData.condition),
        }]);

        router.push({
            pathname: '/(main)/forecast',
            params: {
                ...weatherData,
                weekForecast,
                date: selectedDate.toISOString(),
            },
        });
    };

    if (!fontsLoaded || loading || !coordinates.lat) {
        return (
            <View className="flex-1 bg-[#E7F4EA] justify-center items-center">
                <ActivityIndicator size="large" color="#0B4D26" />
                <Text className="text-[#0B4D26] mt-2">Loading weather data...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-[#E7F4EA] justify-center items-center">
                <Text className="text-[#0B4D26] text-lg">{error}</Text>
                <TouchableOpacity onPress={fetchWeatherData} className="mt-4">
                    <Text className="text-[#0B4D26]">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.locationWrap}>
                        <Ionicons name="location" size={16} color="#fff" />
                        <Text style={styles.locationText} numberOfLines={1}>{weatherData.location}</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroLabel}>Current Weather</Text>
                        <Text style={styles.heroTemp}>{weatherData.temp}</Text>
                        <Text style={styles.heroCondition}>{weatherData.condition}</Text>
                    </View>
                    <View style={styles.heroIcon}>
                        <Ionicons name={mapWeatherConditionToIcon(weatherData.condition) as any} size={42} color="#0B4D26" />
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 28 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Choose Day</Text>
                    <DaySelector selectedDate={selectedDate} onSelectDate={handleDateChange} />
                </View>

                <View style={styles.metricsGrid}>
                    <WeatherMetric icon="water-outline" label="Humidity" value={weatherData.humidity} />
                    <WeatherMetric icon="navigate-outline" label="Wind" value={weatherData.wind} />
                    <WeatherMetric icon="speedometer-outline" label="Pressure" value={weatherData.pressure} />
                    <WeatherMetric icon="eye-outline" label="Visibility" value={weatherData.visibility} />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Hourly Forecast</Text>
                        <Text style={styles.sectionHint}>{selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    </View>
                    {hourlyForecast.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyList}>
                            {hourlyForecast.map((hour: any, index) => (
                                <View key={`${hour.time}-${index}`} style={[styles.hourCard, hour.isNow && styles.hourCardActive]}>
                                    <Text style={[styles.hourTime, hour.isNow && styles.hourTextActive]}>{hour.time}</Text>
                                    <Ionicons name={hour.icon as any} size={28} color={hour.isNow ? '#fff' : '#0B4D26'} />
                                    <Text style={[styles.hourTemp, hour.isNow && styles.hourTextActive]}>{hour.temp}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No hourly forecast available for this day.</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleGetRecommended}
                >
                    <Text style={styles.primaryButtonText}>Use Weather In Recommendations</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function WeatherMetric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
                <Ionicons name={icon} size={20} color="#0B4D26" />
            </View>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8F8F0',
    },
    header: {
        backgroundColor: '#2F6B43',
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 8,
    },
    locationText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    heroCard: {
        marginTop: 18,
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    heroLabel: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '700',
    },
    heroTemp: {
        color: '#0B4D26',
        fontSize: 52,
        fontWeight: '300',
        marginTop: 2,
    },
    heroCondition: {
        color: '#111827',
        fontSize: 17,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    heroIcon: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        marginBottom: 10,
    },
    sectionTitle: {
        color: '#111827',
        fontSize: 18,
        fontWeight: '800',
        paddingHorizontal: 18,
        marginBottom: 10,
    },
    sectionHint: {
        color: '#34643F',
        fontSize: 12,
        fontWeight: '800',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        marginTop: 18,
        rowGap: 12,
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E8E8E0',
    },
    metricIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    metricLabel: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '700',
    },
    metricValue: {
        color: '#111827',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 2,
    },
    hourlyList: {
        paddingHorizontal: 18,
        paddingVertical: 4,
        gap: 10,
    },
    hourCard: {
        width: 82,
        height: 118,
        borderRadius: 24,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#D7E8DA',
    },
    hourCardActive: {
        backgroundColor: '#0B4D26',
        borderColor: '#0B4D26',
    },
    hourTime: {
        color: '#0B4D26',
        fontSize: 13,
        fontWeight: '800',
    },
    hourTemp: {
        color: '#0B4D26',
        fontSize: 17,
        fontWeight: '800',
    },
    hourTextActive: {
        color: '#fff',
    },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginHorizontal: 18,
        borderWidth: 1,
        borderColor: '#E8E8E0',
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#0B4D26',
        borderRadius: 16,
        paddingVertical: 16,
        marginHorizontal: 18,
        marginTop: 22,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
