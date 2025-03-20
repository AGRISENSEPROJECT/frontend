import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function ImageCapture() {
  // State to manage camera permission, camera type (front/back), captured image, and camera reference
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back); // Default to back camera
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  // Request camera permission when the component mounts
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Function to take a picture
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedImage(photo.uri);
    }
  };

  // Handling permission state
  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {/* If no image is captured, show the camera view */}
      {!capturedImage ? (
        <Camera ref={cameraRef} type={type} style={{ flex: 1 }}>
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            {/* Button to take a picture */}
            <TouchableOpacity
              style={{
                backgroundColor: 'white',
                padding: 16,
                borderRadius: 50,
              }}
              onPress={takePicture}
            >
              <Ionicons name="camera" size={30} color="black" />
            </TouchableOpacity>
          </View>
        </Camera>
      ) : (
        // If an image is captured, display the image and show a button to retake
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={{ uri: capturedImage }} style={{ width: '100%', height: '75%' }} resizeMode="contain" />
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: '#3b82f6',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => setCapturedImage(null)} // Reset captured image to retake the picture
          >
            <Text style={{ color: 'white', fontSize: 18 }}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
