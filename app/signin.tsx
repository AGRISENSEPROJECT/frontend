import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
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

        // Simply navigate to dashboard without any logic
        router.push('/(main)/dashboard');
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
                        className="bg-[#0B4D26] p-4 rounded-lg mt-4"
                    >
                        <Text className="text-white text-center font-semibold text-lg">
                            Login
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
                                <AntDesign name="facebook-square" size={24} color="#4267B2" />
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
        </SafeAreaView>
    );
}
