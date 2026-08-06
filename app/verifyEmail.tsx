import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import Animated, {
    withTiming,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

export default function VerifyEmail() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [code, setCode] = useState('');
    const codeInputRef = useRef<TextInput>(null);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });
    const [error, setError] = useState('');
    const [email, setEmail] = useState<string>('');
    const [userId, setUserId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (params.email) {
            setEmail(params.email as string);
        }
        if (params.userId) {
            setUserId(params.userId as string);
        }
    }, [params.email, params.userId]);

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await authApi.verifyEmail({
                email: email,
                otp: code,
            });

            // Backend verify-otp does not issue tokens — farmer must sign in next.
            setModalVisible(true);
            setTimeout(() => {
                setModalVisible(false);
                router.replace('/signin');
            }, 2500);
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (value: string) => {
        setCode(value.replace(/[^0-9]/g, '').slice(0, 6));
    };

    const handleResendCode = async () => {
        const safeEmail =
            email && email !== 'undefined' && email.includes('@') ? email : '';

        if (!safeEmail && !userId) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Missing Information',
                message: 'Email missing. Please try signing up again.',
            });
            return;
        }

        try {
            await authApi.resendOTP({
                email: safeEmail || undefined,
                userId: userId || undefined,
            });
            setStatusModal({
                visible: true,
                type: 'success',
                title: 'Code Resent',
                message: 'A new verification code has been sent to your email.',
            });
        } catch (err: any) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Resend Failed',
                message: err.message || 'Failed to resend code',
            });
        }
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
                        Your email has been successfully verified. Please sign in to continue.
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
                        Please enter the 6-digit code sent to {email}
                    </Text>
                </View>

                {/* Code input: one hidden input holds the code, boxes just display it */}
                <View className="w-full mt-6 mb-2">
                    <View className="flex-row justify-between">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <View
                                key={index}
                                className={`w-[14%] h-12 bg-[#F5F5F5] rounded-md items-center justify-center border ${
                                    index === code.length ? 'border-[#0B4D26]' : 'border-gray-200'
                                }`}
                            >
                                <Text style={{ fontSize: 18 }}>{code[index] || ''}</Text>
                            </View>
                        ))}
                    </View>
                    <TextInput
                        ref={codeInputRef}
                        value={code}
                        onChangeText={handleCodeChange}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                        caretHidden
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0,
                        }}
                    />
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
                    disabled={loading}
                    className={`w-full bg-[#0B4D26] p-3.5 rounded-md mt-6 ${loading ? 'opacity-70' : ''}`}
                >
                    <Text className="text-white text-center font-medium">
                        {loading ? 'Verifying...' : 'Confirm'}
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

            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />

            {/* Replace the Modal with custom popup */}
            <SuccessPopup
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    router.replace('/signin');
                }}
            />
        </SafeAreaView>
    );
}
