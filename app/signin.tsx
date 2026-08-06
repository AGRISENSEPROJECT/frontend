import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';

import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import { isFarmerRole } from '@/utils/userDisplay';
import { getPostAuthRoute, persistAuthSession } from '@/utils/session';

const PHONE_RE = /^\+?[1-9]\d{1,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    });
    const [errors, setErrors] = useState({
        identifier: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = () => {
        const id = formData.identifier.trim();
        let identifierError = '';
        if (!id) {
            identifierError = 'Email or phone number is required';
        } else if (id.includes('@')) {
            if (!EMAIL_RE.test(id)) identifierError = 'Invalid email format';
        } else if (PHONE_RE.test(id.replace(/[\s-]/g, ''))) {
            // valid phone (allow spaces/dashes typed by user — normalized on submit)
        } else if (/[a-zA-Z]/.test(id)) {
            identifierError =
                'Username login is not supported. Use your email or phone (e.g. +250788123456)';
        } else {
            identifierError = 'Use your email or phone in international format, e.g. +250788123456';
        }

        const newErrors = {
            identifier: identifierError,
            password: !formData.password ? 'Password is required' : '',
        };

        setErrors(newErrors);
        return Object.values(newErrors).every((error) => error === '');
    };

    const handleSignIn = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const id = formData.identifier.trim();
            const payload = id.includes('@')
                ? { email: id, password: formData.password }
                : { phoneNumber: id.replace(/[\s-]/g, ''), password: formData.password };

            const data = await authApi.signin(payload);

            // HTTP 200 special body — email not verified, no tokens
            if (data.isEmailVerified === false) {
                router.push(
                    `/verifyEmail?email=${encodeURIComponent(data.email || (id.includes('@') ? id : ''))}&userId=${data.userId || ''}`,
                );
                return;
            }

            if (data.access_token && data.user) {
                if (!isFarmerRole(data.user.role)) {
                    setStatusModal({
                        visible: true,
                        type: 'info',
                        title: 'Farmer app only',
                        message:
                            'This mobile app is for farmer accounts. Please use the web portal for your role.',
                    });
                    return;
                }

                await persistAuthSession({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    user: data.user,
                });

                router.replace(getPostAuthRoute(data.user) as any);
            }
        } catch (error: any) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Login Failed',
                message: error.message || 'Invalid credentials or email not verified',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4">
                <TouchableOpacity
                    onPress={handleBackPress}
                    className="mt-2 p-2"
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View className="mt-4">
                    <Text className="text-2xl font-bold">Sign in</Text>
                </View>

                <View className="items-center justify-center my-8">
                    <Image
                        source={require('../assets/login-illustration.png')}
                        className="w-64 h-64"
                        resizeMode="contain"
                    />
                </View>

                <View className="space-y-6 mt-8">
                    <View>
                        <TextInput
                            placeholder="Email or phone (+250...), not username"
                            value={formData.identifier}
                            onChangeText={(text) => setFormData({ ...formData, identifier: text })}
                            className={`bg-gray-100 mb-4 p-4 rounded-lg ${errors.identifier ? 'border-red-500 border' : ''}`}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.identifier ? (
                            <Text className="text-red-500 text-sm mt-1">{errors.identifier}</Text>
                        ) : null}
                    </View>

                    <View className="relative">
                        <TextInput
                            placeholder="Password"
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            secureTextEntry={!showPassword}
                            className={`bg-gray-100 p-4 mb-4 rounded-lg ${errors.password ? 'border-red-500 border' : ''}`}
                        />
                        {errors.password ? <Text className="text-red-500 text-sm mt-1">{errors.password}</Text> : null}
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4"
                        >
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/forgot-password')}
                        className="items-end"
                    >
                        <Text className="text-[#0B4D26] text-sm">Forgot your password? Reset here</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSignIn}
                        disabled={loading}
                        className={`bg-[#0B4D26] p-4 rounded-lg mt-4 ${loading ? 'opacity-70' : ''}`}
                    >
                        <Text className="text-white text-center font-semibold text-lg">
                            {loading ? 'Logging in...' : 'Login'}
                        </Text>
                    </TouchableOpacity>

                    <View className="mt-8">
                        <Text className="text-center text-gray-500 mb-4">or sign in with</Text>

                        <View className="flex-row justify-center space-x-6">
                            <TouchableOpacity className="p-2">
                                <AntDesign name="google" size={24} color="#DB4437" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <AntDesign name="twitter" size={24} color="#1DA1F2" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <AntDesign name="instagram" size={24} color="#E1306C" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row justify-center mt-8 mb-10">
                        <Text className="text-gray-500">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text className="text-[#0B4D26] font-semibold">Sign up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </SafeAreaView>
    );
}
