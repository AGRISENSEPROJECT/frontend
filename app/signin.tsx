import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignIn() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        const newErrors = {
            email: !formData.email ? 'Email is required' :
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Invalid email format' : '',
            password: !formData.password ? 'Password is required' : '',
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== '');
    };

    const handleSignIn = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        // Simulate API call delay
        setTimeout(async () => {
            try {
                // Simulate successful login
                const mockToken = 'mock_jwt_token_' + Date.now();
                await AsyncStorage.setItem('token', mockToken);
                await AsyncStorage.setItem('userEmail', formData.email);
                await AsyncStorage.setItem('isLoggedIn', 'true');

                // Navigate to dashboard
                router.push('/dashboard');
            } catch (error) {
                Alert.alert('Error', 'Failed to sign in. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }, 1500); // 1.5 second delay to simulate API call
    };

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white pt-6">
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
                            editable={!isLoading}
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
                            editable={!isLoading}
                        />
                        {errors.password ? <Text className="text-red-500 text-sm mt-1">{errors.password}</Text> : null}
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4"
                            disabled={isLoading}
                        >
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/forgot-password')}
                        className="items-end"
                        disabled={isLoading}
                    >
                        <Text className="text-[#0B4D26] text-sm">Forgot your password? Reset here</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSignIn}
                        className={`p-4 rounded-lg mt-4 ${isLoading ? 'bg-gray-400' : 'bg-[#0B4D26]'}`}
                        disabled={isLoading}
                    >
                        <Text className="text-white text-center font-semibold text-lg">
                            {isLoading ? 'Signing in...' : 'Login'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center space-x-2 mt-6">
                        <Text className="text-gray-500">Don't have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/signup')} disabled={isLoading}>
                            <Text className="text-[#0B4D26] font-semibold">Sign up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
