import ENV from '@/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper for authenticated requests with automatic token refresh
const authenticatedFetch = async (endpoint: string, options: any = {}): Promise<any> => {
    let token = await AsyncStorage.getItem('token');

    const makeRequest = async (tokenToUse: string) => {
        return await fetch(`${ENV.API_URL}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${tokenToUse}`,
                'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
            },
        });
    };

    let response = await makeRequest(token || '');

    // If unauthorized (401), try to refresh token
    if (response.status === 401) {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                const refreshResponse = await fetch(`${ENV.API_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    const newToken = refreshData.access_token;

                    // Save new token
                    await AsyncStorage.setItem('token', newToken);

                    // Retry original request with new token
                    response = await makeRequest(newToken);
                } else {
                    // Refresh token expired or invalid - clear session
                    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }
    }

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || 'Request failed');
    }
    return result;
};

export const authApi = {
    endpoints: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        profile: '/api/auth/profile',
        updateProfile: '/api/auth/profile',
        uploadProfileImage: '/api/auth/profile/image',
        deleteProfileImage: '/api/auth/profile/image',
        changePassword: '/api/auth/change-password',
        forgotPassword: '/api/auth/forgot-password',
        resetPassword: '/api/auth/reset-password',
        logout: '/api/auth/logout',
        refresh: '/api/auth/refresh',
        verifyEmail: '/api/auth/verify-otp',
        resendOTP: '/api/auth/resend-otp',
        registerFarm: '/api/farms',
        getFarms: '/api/farms',
        farmById: (id: string) => `/api/farms/${id}`,
        createPost: '/api/community/posts',
        getPosts: '/api/community/posts',
        likePost: (id: string) => `/api/community/posts/${id}/like`,
        commentPost: (id: string) => `/api/community/posts/${id}/comment`,
    },

    signup: async (data: SignupData): Promise<SignupResponse> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.register}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Signup failed');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    signin: async (data: SigninData): Promise<SigninResponse> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.login}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Login failed');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    getProfile: async (token: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.profile, {
            method: 'GET',
        });
    },

    updateProfile: async (data: { username?: string; phoneNumber?: string }, token: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.updateProfile, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    uploadProfileImage: async (imageUri: string, token: string): Promise<any> => {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('image', {
            uri: imageUri,
            name: filename,
            type,
        } as any);

        return await authenticatedFetch(authApi.endpoints.uploadProfileImage, {
            method: 'POST',
            body: formData,
        });
    },

    deleteProfileImage: async (token: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.deleteProfileImage, {
            method: 'DELETE',
        });
    },

    changePassword: async (data: { currentPassword: string; newPassword: string }, token: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.changePassword, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    forgotPassword: async (email: string): Promise<any> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.forgotPassword}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to request reset code');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<any> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.resetPassword}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to reset password');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    logout: async (token: string, refreshToken: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.logout, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
    },

    refreshToken: async (refreshToken: string): Promise<any> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.refresh}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Token refresh failed');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    registerFarm: async (data: any, token: string): Promise<any> => {
        const payload = {
            name: data.farmName,
            size: parseFloat(data.farmSize) || 0,
            soilType: data.soilType.toLowerCase(),
            country: data.country,
            province: data.province,
            district: data.district,
            sector: data.sector,
            cell: data.cell,
            village: data.village,
            ownerName: data.ownerName,
            ownerPhone: data.phoneNumber,
            ownerEmail: data.emailAddress
        };

        return await authenticatedFetch(authApi.endpoints.registerFarm, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    getFarms: async (): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.getFarms, {
            method: 'GET',
        });
    },

    getFarmById: async (farmId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.farmById(farmId), {
            method: 'GET',
        });
    },

    updateFarm: async (farmId: string, data: any): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.farmById(farmId), {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    deleteFarm: async (farmId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.farmById(farmId), {
            method: 'DELETE',
        });
    },

    createPost: async (data: { description: string; imageUrl?: string }): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.createPost, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getPosts: async (): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.getPosts, {
            method: 'GET',
        });
    },

    likePost: async (postId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.likePost(postId), {
            method: 'POST',
        });
    },

    commentPost: async (postId: string, content: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.commentPost(postId), {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    verifyEmail: async (data: { email: string; otp: string }): Promise<any> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.verifyEmail}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Verification failed');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },

    resendOTP: async (userId: string): Promise<any> => {
        try {
            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.resendOTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to resend code');
            }
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'Network error');
        }
    },
};

export type SignupData = {
    email: string;
    username: string;
    password: string;
};

export type SigninData = {
    email: string;
    password: string;
};

export type SignupResponse = {
    message: string;
    userId: string;
};

export type SigninResponse = {
    access_token: string;
    refresh_token?: string;
    user: {
        id: string;
        email: string;
        username: string;
        isEmailVerified: boolean;
        hasFarm: boolean;
    };
};

export type FarmData = {
    farmName: string;
    farmSize: string;
    soilType: string;
    country: string;
    province: string;
    district: string;
    gpsCoordinates: string;
    ownerName: string;
    phoneNumber: string;
    emailAddress?: string;
};
