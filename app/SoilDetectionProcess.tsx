import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SoilDetectionProcess() {
    const router = useRouter();

    const handleFinishDetection = () => {
        // Logic to finish soil detection
        alert('Soil detection completed!');
        router.push('/DeviceConnection'); // Navigate to the Device Connection screen
    };

    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
            <View className="p-4">
                <Text className="text-2xl font-bold">Soil Detection in Progress</Text>
                <Text className="text-center text-gray-600 mt-2">
                    Please wait while we analyze the soil properties...
                </Text>
                {/* Simulate a loading process */}
                <TouchableOpacity
                    onPress={handleFinishDetection}
                    className="bg-[#0B4D26] p-4 rounded-lg mt-6"
                >
                    <Text className="text-white text-lg font-semibold text-center">Finish Detection</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
