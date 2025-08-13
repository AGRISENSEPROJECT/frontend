import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';


export default function DeviceConnection() {
    const router = useRouter();


    const handleStartSensor = () => {
        // Navigate to the image capture screen
        router.push('/ResultsPage');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 p-4">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Device Connection</Text>
                    <View style={styles.icons}>
                        <Ionicons name="notifications-outline" size={24} color="black" />
                        <Ionicons name="ellipsis-vertical" size={24} color="black" />
                    </View>
                </View>

                <View className="mt-4">
                    <Image
                        source={require('../assets/device.png')}
                        className="w-full h-24 rounded-lg"
                        resizeMode="cover"
                    />
                </View>

                <View className="mt-6">
                    <Text className="text-lg font-semibold">Paired Devices</Text>
                    <Text className="text-gray-600">BMP280 <Text className="text-green-500">● connected</Text></Text>
                </View>

                <View className="mt-4">
                    <Text className="text-lg font-semibold">Available Devices</Text>
                    {['BMP280', 'DS18B20', 'MPU9250', 'BMP280', 'TCS34725'].map((device, index) => (
                        <View key={index} className="flex-row justify-between items-center p-2 border-b border-gray-200">
                            <Text>{device}</Text>
                            <TouchableOpacity className="text-[#0B4D26]">
                                <Text>connect</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => navigation.navigate('ResultsPage')}
                >
                    <Text style={styles.nextButtonText}>Check Results</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    icons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
        elevation: 2,
    },
    cardText: {
        flex: 1,
        marginLeft: 10,
    },
    cardDate: {
        color: 'gray',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    toggleButton: {
        padding: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 20,
        marginHorizontal: 5,
    },
    toggleButtonSelected: {
        padding: 10,
        backgroundColor: '#0B4D26',
        borderRadius: 20,
        marginHorizontal: 5,
    },
    toggleText: {
        color: 'black',
    },
    toggleTextSelected: {
        color: 'white',
    },
    scrollView: {
        flex: 1,
    },
    propertyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        marginBottom: 10,
    },
    propertyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 10,
    },
    npkCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        marginTop: 20,
    },
    npkTitle: {
        fontWeight: 'bold',
    },
    nextButton: {
        backgroundColor: '#0B4D26',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
