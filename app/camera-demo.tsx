import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SoilAnalysisLoading from './components/SoilAnalysisLoading';

export default function CameraDemo() {
    const router = useRouter();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const handleStartScanning = () => {
        setIsScanning(true);
        // Simulate camera scanning for 3 seconds
        setTimeout(() => {
            setIsScanning(false);
            setIsAnalyzing(true);
        }, 3000);
    };

    const handleAnalysisComplete = () => {
        router.push('/CropRecommendation');
    };

    if (isAnalyzing) {
        return (
            <SoilAnalysisLoading 
                method="camera" 
                onComplete={handleAnalysisComplete} 
            />
        );
    }

    if (isScanning) {
        return (
            <View style={styles.scanningContainer}>
                <View style={styles.scanningContent}>
                    <View style={styles.cameraFrame}>
                        <View style={styles.cameraView}>
                            <View style={styles.scanningOverlay}>
                                <Text style={styles.scanningText}>Scanning Soil...</Text>
                                <View style={styles.scanningLine} />
                            </View>
                        </View>
                    </View>
                    
                    <Text style={styles.scanningStatus}>
                        Analyzing soil composition in real-time...
                    </Text>
                    
                    <View style={styles.scanningSteps}>
                        <Text style={styles.stepText}>• Detecting soil texture</Text>
                        <Text style={styles.stepText}>• Analyzing color patterns</Text>
                        <Text style={styles.stepText}>• Identifying soil type</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Real-time Soil Scanner</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Camera Preview */}
                <View style={styles.cameraPreview}>
                    <View style={styles.cameraFrame}>
                        <View style={styles.cameraView}>
                            <View style={styles.cameraPlaceholder}>
                                <Ionicons name="camera" size={64} color="#0B4D26" />
                                <Text style={styles.cameraPlaceholderText}>Camera Ready</Text>
                                <Text style={styles.cameraPlaceholderSubtext}>
                                    Point camera at soil for analysis
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    <Text style={styles.instructionsTitle}>How to Scan:</Text>
                    <View style={styles.instructionSteps}>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepNumber}>1</View>
                            <Text style={styles.stepText}>Position your camera 6-12 inches above the soil</Text>
                        </View>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepNumber}>2</View>
                            <Text style={styles.stepText}>Ensure good lighting and clear focus</Text>
                        </View>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepNumber}>3</View>
                            <Text style={styles.stepText}>Tap "Start Scanning" to begin analysis</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={handleStartScanning}
                    >
                        <Ionicons name="camera" size={24} color="white" />
                        <Text style={styles.scanButtonText}>Start Scanning</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="image" size={24} color="#0B4D26" />
                        <Text style={styles.uploadButtonText}>Upload Image Instead</Text>
                    </TouchableOpacity>
                </View>

                {/* Tips */}
                <View style={styles.tipsBox}>
                    <Text style={styles.tipsTitle}>💡 Pro Tips:</Text>
                    <Text style={styles.tipsText}>
                        • Clean soil surface for better results{'\n'}
                        • Avoid shadows and reflections{'\n'}
                        • Scan multiple areas for comprehensive analysis{'\n'}
                        • Ensure camera is stable during scanning
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B4D26',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#0B4D26',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FAF9F6',
    },
    cameraPreview: {
        alignItems: 'center',
        marginBottom: 30,
    },
    cameraFrame: {
        borderWidth: 4,
        borderColor: '#0B4D26',
        borderRadius: 20,
        padding: 20,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    cameraView: {
        width: 280,
        height: 200,
        backgroundColor: '#f3f4f6',
        borderRadius: 15,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraPlaceholder: {
        alignItems: 'center',
    },
    cameraPlaceholderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginTop: 10,
    },
    cameraPlaceholderSubtext: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 5,
    },
    instructions: {
        marginBottom: 30,
    },
    instructionsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 15,
    },
    instructionSteps: {
        space: 15,
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#0B4D26',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    stepText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    buttonContainer: {
        marginBottom: 30,
    },
    scanButton: {
        backgroundColor: '#0B4D26',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    uploadButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0B4D26',
    },
    uploadButtonText: {
        color: '#0B4D26',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    tipsBox: {
        backgroundColor: '#dbeafe',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#93c5fd',
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 10,
    },
    tipsText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    // Scanning styles
    scanningContainer: {
        flex: 1,
        backgroundColor: '#0B4D26',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scanningContent: {
        alignItems: 'center',
    },
    scanningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(11, 77, 38, 0.8)',
    },
    scanningText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    scanningLine: {
        width: '80%',
        height: 3,
        backgroundColor: '#10b981',
        borderRadius: 2,
    },
    scanningStatus: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    scanningSteps: {
        alignItems: 'center',
    },
});
