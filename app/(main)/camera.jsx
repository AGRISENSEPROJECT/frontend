import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function CameraPage() {
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraType, setCameraType] = useState('back');
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [flashMode, setFlashMode] = useState('off');
    const [isWeb] = useState(Platform.OS === 'web');
    const [permissionError, setPermissionError] = useState(null);
    const cameraRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (isWeb) {
            setupWebCamera();
        } else {
            setupMobileCamera();
        }
    }, []);

    const setupWebCamera = async () => {
        try {
            console.log('Setting up web camera...');

            // First check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Request camera permission with simpler constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            console.log('Camera stream obtained:', stream);
            streamRef.current = stream;

            // Set permission to true immediately after getting stream
            setHasPermission(true);

            // Wait for next render cycle to ensure video element exists
            setTimeout(() => {
                if (videoRef.current) {
                    console.log('Video element found, setting up stream...');
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        console.log('Web camera ready!');
                        setIsCameraReady(true);
                    };
                    videoRef.current.onerror = (error) => {
                        console.error('Video error:', error);
                        setPermissionError('Video element error');
                        setHasPermission(false);
                    };
                } else {
                    console.error('Video ref not available after timeout');
                    setPermissionError('Video element not found');
                    setHasPermission(false);
                }
            }, 500); // Increased timeout to ensure component is fully rendered
        } catch (error) {
            console.error('Web camera error:', error);
            let errorMessage = 'Camera access denied';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on your device.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Camera not supported in this browser.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is already in use by another application.';
            }

            setPermissionError(errorMessage);
            setHasPermission(false);
        }
    };

    const setupMobileCamera = async () => {
        try {
            const { Camera } = await import('expo-camera');
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        } catch (error) {
            console.error('Mobile camera setup failed:', error);
            setHasPermission(false);
        }
    };

    const onCameraReady = () => {
        setIsCameraReady(true);
    };

    const takePicture = async () => {
        if (isWeb) {
            // Capture from webcam
            if (videoRef.current && streamRef.current) {
                const canvas = document.createElement('canvas');
                const video = videoRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageDataUrl);
            }
            return;
        }

        if (!cameraRef.current) {
            Alert.alert('Error', 'Camera not ready');
            return;
        }

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                base64: false,
            });
            console.log('Photo captured:', photo.uri);
            setCapturedImage(photo.uri);
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Error', 'Failed to take picture');
        }
    };

    const switchCamera = async () => {
        const newCameraType = cameraType === 'back' ? 'front' : 'back';
        setCameraType(newCameraType);

        if (isWeb && streamRef.current) {
            // Stop current stream
            streamRef.current.getTracks().forEach(track => track.stop());

            // Start new stream with different camera
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: newCameraType === 'front' ? 'user' : 'environment'
                    }
                });
                streamRef.current = newStream;

                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
            } catch (error) {
                console.error('Error switching web camera:', error);
            }
        }
    };

    const toggleFlash = () => {
        setFlashMode(current => current === 'off' ? 'on' : 'off');
    };

    const retakePicture = () => {
        setCapturedImage(null);
    };

    const saveImage = () => {
        Alert.alert(
            'Success!',
            'Image captured successfully!',
            [
                { text: 'Retake', onPress: retakePicture },
                { text: 'Use Image', onPress: () => router.back() }
            ]
        );
    };

    const retryCamera = () => {
        setHasPermission(null);
        setPermissionError(null);
        setIsCameraReady(false);
        if (isWeb) {
            setupWebCamera();
        } else {
            setupMobileCamera();
        }
    };

    // Cleanup streams on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Setting up camera...</Text>
                </View>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.errorContainer}>
                    <Ionicons name="camera" size={64} color="white" />
                    <Text style={styles.errorText}>Camera access denied</Text>
                    {permissionError && (
                        <Text style={styles.errorDetails}>{permissionError}</Text>
                    )}
                    <TouchableOpacity style={styles.button} onPress={retryCamera}>
                        <Text style={styles.buttonText}>Retry Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {!capturedImage ? (
                isWeb ? (
                    // Web camera with real webcam feed
                    <View style={styles.camera}>
                        <View style={styles.headerControls}>
                            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
                                <Ionicons name={flashMode === 'on' ? "flash" : "flash-off"} size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Webcam Video Feed */}
                        <video
                            ref={videoRef}
                            style={styles.webcamVideo}
                            autoPlay
                            playsInline
                            muted
                        />

                        <View style={styles.cameraFrame}>
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                        </View>

                        <View style={styles.bottomControls}>
                            <View style={styles.controlRow}>
                                <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                                    <Ionicons name="camera-reverse" size={28} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
                                    onPress={takePicture}
                                    disabled={!isCameraReady}
                                >
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>
                                <View style={styles.controlButton} />
                            </View>
                        </View>
                    </View>
                ) : (
                    // Real camera for mobile
                    <Camera
                        ref={cameraRef}
                        type={cameraType}
                        style={styles.camera}
                        onCameraReady={onCameraReady}
                        flashMode={flashMode}
                    >
                        <View style={styles.headerControls}>
                            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
                                <Ionicons name={flashMode === 'on' ? "flash" : "flash-off"} size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cameraFrame}>
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                            <View style={styles.frameCorner} />
                        </View>

                        <View style={styles.bottomControls}>
                            <View style={styles.controlRow}>
                                <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                                    <Ionicons name="camera-reverse" size={28} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
                                    onPress={takePicture}
                                    disabled={!isCameraReady}
                                >
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>
                                <View style={styles.controlButton} />
                            </View>
                        </View>
                    </Camera>
                )
            ) : (
                // Image preview
                <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    <View style={styles.previewControls}>
                        <TouchableOpacity style={styles.previewButton} onPress={retakePicture}>
                            <Ionicons name="refresh" size={24} color="white" />
                            <Text style={styles.previewButtonText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.previewButton, styles.saveButton]} onPress={saveImage}>
                            <Ionicons name="checkmark" size={24} color="white" />
                            <Text style={styles.previewButtonText}>Use Image</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
        position: 'relative',
    },
    webcamVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'white',
        fontSize: 18,
        marginTop: 16,
        textAlign: 'center',
    },
    errorDetails: {
        color: '#ff6b6b',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    secondaryButton: {
        backgroundColor: '#6b7280',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    headerControls: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraFrame: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: width * 0.8,
        height: width * 0.8,
        marginLeft: -(width * 0.4),
        marginTop: -(width * 0.4),
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
    },
    frameCorner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: 'white',
        borderWidth: 3,
    },
    bottomControls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
    previewContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    previewImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    previewControls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    previewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    saveButton: {
        backgroundColor: '#10b981',
    },
    previewButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
