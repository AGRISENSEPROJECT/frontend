import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    withTiming,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

export default function VerifyEmail() {
    const router = useRouter();
    const [code, setCode] = useState(['', '', '', '']); // Changed to array for separate inputs
    const [error, setError] = useState('');
    const [email, setEmail] = useState<string>('raphyboy@gmail.com'); // Default email
    const [modalVisible, setModalVisible] = useState(false); // State for modal visibility

    useEffect(() => {
        // Get the email from the router params
        const emailParam = router.query?.email as string;
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [router.query?.email]);

    const handleVerify = () => {
        const combinedCode = code.join('');
        if (code.some(digit => digit === '')) {
            setError('Please enter a valid 4-digit code');
            return;
        }

        // Simulate verification logic
        if (combinedCode === '1234') {
            setModalVisible(true);
            // Modal will auto-close after 3 seconds and redirect to community page
            setTimeout(() => {
                setModalVisible(false);
                router.push('/(main)/community');
            }, 3000);
        } else {
            setError('Invalid verification code');
        }
    };

    const handleCodeChange = (value: string, index: number) => {
        // Remove non-numeric characters
        const cleanValue = value.replace(/[^0-9]/g, '');
        const lastDigit = cleanValue.slice(-1);

        const newCode = [...code];

        if (cleanValue) {
            // Update current input
            newCode[index] = lastDigit;

            // Auto-advance to next input if available
            if (index < 3 && lastDigit) {
                setCode(newCode);
            }
        } else {
            // Handle deletion
            newCode[index] = '';
        }
        setCode(newCode);
    };

    const handleResendCode = () => {
        // Logic to resend the verification code
        alert('Verification code resent!');
    };

    const handleChangeEmail = () => {
        // Redirect to sign-in page when changing email
        router.push('/signin');
    };

    // Custom success popup component with progress bar
    const SuccessPopup = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
        const progress = useSharedValue(1);

        useEffect(() => {
            if (visible) {
                progress.value = 1;
                // Start shrinking animation
                progress.value = withTiming(0, { duration: 3000 });

                // Auto close after 3 seconds
                const timer = setTimeout(() => {
                    onClose();
                }, 3000);

                return () => clearTimeout(timer);
            }
        }, [visible]);

        const progressStyle = useAnimatedStyle(() => ({
            width: `${progress.value * 100}%`,
        }));

        if (!visible) return null;

        return (
            <View className="absolute inset-0 bg-black/50 justify-center items-center">
                <View className="bg-white rounded-2xl p-6 m-6 items-center w-[80%]">
                    <View className="w-16 h-16 bg-[#0B4D26] rounded-full items-center justify-center mb-4">
                        <Ionicons name="checkmark" size={30} color="white" />
                    </View>

                    <Text className="text-xl font-bold text-center mb-2">
                        Email Verified!
                    </Text>

                    <Text className="text-gray-600 text-center mb-6">
                        Your email has been successfully verified
                    </Text>

                    {/* Progress bar */}
                    <View className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <Animated.View
                            className="h-full bg-[#0B4D26] rounded-full"
                            style={progressStyle}
                        />
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-6 items-center">
                <Image
                    source={require('../assets/verification-illustration.png')}
                    className="w-40 h-40 mt-20 mb-10"
                    resizeMode="contain"
                />

                <View className="w-full mb-2">
                    <Text className="text-[#0B4D26] text-2xl font-semibold text-center">
                        Verify your email
                    </Text>
                    <Text className="text-gray-600 mt-2 text-center text-sm">
                        Please enter the 4-digit code sent to {email}
                    </Text>
                </View>

                {/* Code input container */}
                <View className="w-full flex-row justify-between mt-6 mb-2">
                    {[0, 1, 2, 3].map((index) => (
                        <TextInput
                            key={index}
                            value={code[index]}
                            onChangeText={(value) => handleCodeChange(value, index)}
                            className="w-[22%] h-12 bg-[#F5F5F5] rounded-md text-center text-lg border-[0.5px] border-gray-200"
                            keyboardType="numeric"
                            maxLength={1}
                            style={{ fontSize: 18 }}
                            selectTextOnFocus={true}
                        />
                    ))}
                </View>

                {error ? <Text className="text-red-500 text-sm mb-2">{error}</Text> : null}

                <TouchableOpacity
                    onPress={handleResendCode}
                    className="mt-2"
                >
                    <Text className="text-[#0B4D26] text-center text-sm">Resend code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleVerify}
                    className="w-full bg-[#0B4D26] p-3.5 rounded-md mt-6"
                >
                    <Text className="text-white text-center font-medium">
                        Confirm
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleChangeEmail}
                    className="mt-4"
                >
                    <Text className="text-[#0B4D26] text-sm">Change email</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-gray-400 text-xs text-center mb-4">
                Copyright© 2024 AGRISCAPE. All rights reserved.
            </Text>

            {/* Replace the Modal with custom popup */}
            <SuccessPopup
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    router.push('/(main)/community');
                }}
            />
        </SafeAreaView>
    );
}
