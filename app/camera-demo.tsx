import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CameraDemo() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0B4D26" />
                </TouchableOpacity>
                <Text style={styles.title}>Camera Features</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>
                    This app includes a comprehensive camera feature with the following capabilities:
                </Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="camera" size={24} color="#10b981" />
                        <Text style={styles.featureText}>High-quality image capture</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="camera-reverse" size={24} color="#10b981" />
                        <Text style={styles.featureText}>Switch between front and back cameras</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="flash" size={24} color="#10b981" />
                        <Text style={styles.featureText}>Flash control (on/off)</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="refresh" size={24} color="#10b981" />
                        <Text style={styles.featureText}>Retake photos</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <Text style={styles.featureText}>Preview and confirm captured images</Text>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.cameraButton}
                        onPress={() => router.push('/(main)/camera')}
                    >
                        <Ionicons name="camera" size={24} color="white" />
                        <Text style={styles.cameraButtonText}>Open Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.altCameraButton}
                        onPress={() => router.push('/ImageCapture')}
                    >
                        <Ionicons name="camera-outline" size={24} color="#0B4D26" />
                        <Text style={styles.altCameraButtonText}>Alternative Camera View</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>How to use:</Text>
                    <Text style={styles.infoText}>
                        1. Tap the camera button to open the camera{'\n'}
                        2. Use the camera switch button to change between front/back cameras{'\n'}
                        3. Toggle flash on/off as needed{'\n'}
                        4. Tap the capture button to take a photo{'\n'}
                        5. Preview the image and choose to retake or use it
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B4D26',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    description: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        marginBottom: 24,
    },
    featureList: {
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    featureText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    buttonContainer: {
        marginBottom: 32,
    },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cameraButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    altCameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0B4D26',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    altCameraButtonText: {
        color: '#0B4D26',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    infoBox: {
        backgroundColor: '#f3f4f6',
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10b981',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
});
