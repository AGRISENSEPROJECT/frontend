import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, userHasFarm } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';

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
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = () => {
        const newErrors = {
            email: !formData.email ? 'Email is required' :
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Invalid email format' : '',
            password: !formData.password ? 'Password is required' : '',
        };

        setErrors(newErrors);
        return Object.values(newErrors).every(error => error === '');
    };

    const handleSignIn = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const data = await authApi.signin({
                email: formData.email,
                password: formData.password,
            });

            console.log('Login success:', data);

            // Handle unverified email response schema
            if (data.isEmailVerified === false) {
                router.push(`/verifyEmail?email=${encodeURIComponent(data.email)}&userId=${data.userId}`);
                return;
            }

            // Store token and user info for verified users
            if (data.access_token) {
                await AsyncStorage.setItem('token', data.access_token);
                if (data.refresh_token) {
                    await AsyncStorage.setItem('refreshToken', data.refresh_token);
                }
                await AsyncStorage.setItem('user', JSON.stringify(data.user));

                // Navigate based on user state
                if (userHasFarm(data.user)) {
                    router.push('/(main)/dashboard');
                } else {
                    router.push('/RegisterFarm');
                }
            }
        } catch (error: any) {
            // Professional status modal instead of alert
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

                {/* Illustration View */}
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
                            placeholder="Email address"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            className={`bg-gray-100 mb-4 p-4 rounded-lg ${errors.email ? 'border-red-500 border' : ''}`}
                            keyboardType="email-address"
                        />
                        {errors.email ? <Text className="text-red-500 text-sm mt-1">{errors.email}</Text> : null}
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
                                <AntDesign name="twitter" size={24} color="#1DA1F2" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <AntDesign name="facebook" size={24} color="#4267B2" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <AntDesign name="instagram" size={24} color="#E4405F" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row justify-center mt-6 mb-8">
                        <Text className="text-gray-600">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text className="text-[#0B4D26] font-semibold">Sign Up</Text>
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
