import ENV from '@/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper for authenticated requests with automatic token refresh
const authenticatedFetch = async (endpoint: string, options: any = {}): Promise<any> => {
    let token = await AsyncStorage.getItem('token');

    const makeRequest = async (tokenToUse: string) => {
        const headers: Record<string, string> = {
            ...options.headers,
            'Authorization': `Bearer ${tokenToUse}`,
        };
        // Let fetch set the multipart boundary itself for FormData bodies
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        return await fetch(`${ENV.API_URL}${endpoint}`, {
            ...options,
            headers,
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

// The backend reports farm ownership as `farmsCount`; older code expected `hasFarm`.
// Accept any of the known shapes so login/dashboard guards work correctly.
export const userHasFarm = (user: any): boolean =>
    !!(user?.hasFarm || user?.farm || (user?.farmsCount ?? 0) > 0);

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
        deletePost: (id: string) => `/api/community/posts/${id}`,
        updatePost: (id: string) => `/api/community/posts/${id}`,
        deleteComment: (id: string) => `/api/community/comments/${id}`,
        searchUsers: '/api/community/users',
        conversations: '/api/community/conversations',
        directConversation: '/api/community/conversations/direct',
        groupConversation: '/api/community/conversations/group',
        conversationById: (id: string) => `/api/community/conversations/${id}`,
        conversationMessages: (id: string) => `/api/community/conversations/${id}/messages`,
        conversationRead: (id: string) => `/api/community/conversations/${id}/read`,
        communityPresence: '/api/community/presence',
        notifications: '/api/notifications',
        notificationsUnreadCount: '/api/notifications/unread-count',
        notificationsReadAll: '/api/notifications/read-all',
        notificationRead: (id: string) => `/api/notifications/${id}/read`,
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

    updateProfile: async (data: { username?: string; phoneNumber?: string | null }, token: string): Promise<any> => {
        // Backend exposes PUT /api/auth/profile (PATCH returns 404)
        // Phone is optional — send trimmed value (including '') so users can clear it.
        const payload: { username?: string; phoneNumber?: string } = {};
        if (data.username?.trim()) payload.username = data.username.trim();
        if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
            payload.phoneNumber = String(data.phoneNumber).trim();
        }

        return await authenticatedFetch(authApi.endpoints.updateProfile, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    uploadProfileImage: async (imageUri: string, token: string): Promise<any> => {
        const formData = new FormData();
        const rawName = imageUri.split('?')[0].split('/').pop() || 'profile.jpg';
        const filename = rawName.includes('.') ? rawName : `${rawName}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = (match?.[1] || 'jpeg').toLowerCase();
        const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

        // Web needs a real Blob/File; native uses the { uri, name, type } shape.
        if (typeof document !== 'undefined') {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            formData.append('image', blob, filename);
        } else {
            formData.append('image', {
                uri: imageUri,
                name: filename,
                type,
            } as any);
        }

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
        const payload: Record<string, any> = {
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
            ownerEmail: data.emailAddress,
        };
        if (data.phoneNumber) payload.ownerPhone = data.phoneNumber;

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
        // Backend exposes PUT /api/farms/:id (PATCH returns 404)
        return await authenticatedFetch(authApi.endpoints.farmById(farmId), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteFarm: async (farmId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.farmById(farmId), {
            method: 'DELETE',
        });
    },

    createPost: async (data: {
        title: string;
        description: string;
        imageUri: string;
    }): Promise<any> => {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);

        const rawName = data.imageUri.split('?')[0].split('/').pop() || `post-${Date.now()}.jpg`;
        const filename = rawName.includes('.') ? rawName : `${rawName}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = (match?.[1] || 'jpeg').toLowerCase();
        const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

        // Web needs a Blob/File; native uses { uri, name, type }.
        if (typeof document !== 'undefined') {
            const response = await fetch(data.imageUri);
            const blob = await response.blob();
            formData.append('image', blob, filename);
        } else {
            formData.append('image', {
                uri: data.imageUri,
                name: filename,
                type: type === 'image/jpg' ? 'image/jpeg' : type,
            } as any);
        }

        return await authenticatedFetch(authApi.endpoints.createPost, {
            method: 'POST',
            body: formData,
        });
    },

    getPosts: async (params: { page?: number; limit?: number } = {}): Promise<any> => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        const qs = query.toString();
        return await authenticatedFetch(`${authApi.endpoints.getPosts}${qs ? `?${qs}` : ''}`, {
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

    deletePost: async (postId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.deletePost(postId), {
            method: 'DELETE',
        });
    },

    updatePost: async (
        postId: string,
        data: { title?: string; description: string; imageUri?: string | null },
    ): Promise<any> => {
        const formData = new FormData();
        if (data.title?.trim()) formData.append('title', data.title.trim());
        formData.append('description', data.description);

        if (data.imageUri) {
            const rawName =
                data.imageUri.split('?')[0].split('/').pop() || `post-${Date.now()}.jpg`;
            const filename = rawName.includes('.') ? rawName : `${rawName}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const ext = (match?.[1] || 'jpeg').toLowerCase();
            const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

            if (typeof document !== 'undefined') {
                const response = await fetch(data.imageUri);
                const blob = await response.blob();
                formData.append('image', blob, filename);
            } else {
                formData.append('image', {
                    uri: data.imageUri,
                    name: filename,
                    type: type === 'image/jpg' ? 'image/jpeg' : type,
                } as any);
            }
        }

        return await authenticatedFetch(authApi.endpoints.updatePost(postId), {
            method: 'PATCH',
            body: formData,
        });
    },

    deleteComment: async (commentId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.deleteComment(commentId), {
            method: 'DELETE',
        });
    },

    searchCommunityUsers: async (q?: string): Promise<any[]> => {
        const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
        return await authenticatedFetch(`${authApi.endpoints.searchUsers}${qs}`, {
            method: 'GET',
        });
    },

    listConversations: async (type?: 'direct' | 'group'): Promise<any[]> => {
        const qs = type ? `?type=${type}` : '';
        return await authenticatedFetch(`${authApi.endpoints.conversations}${qs}`, {
            method: 'GET',
        });
    },

    createDirectConversation: async (userId: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.directConversation, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    },

    createGroupConversation: async (name: string, memberIds: string[]): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.groupConversation, {
            method: 'POST',
            body: JSON.stringify({ name, memberIds }),
        });
    },

    getConversation: async (id: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.conversationById(id), {
            method: 'GET',
        });
    },

    getConversationMessages: async (
        id: string,
        params: { page?: number; limit?: number } = {},
    ): Promise<any> => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        const qs = query.toString();
        return await authenticatedFetch(
            `${authApi.endpoints.conversationMessages(id)}${qs ? `?${qs}` : ''}`,
            { method: 'GET' },
        );
    },

    sendConversationMessage: async (id: string, content: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.conversationMessages(id), {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    markConversationRead: async (id: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.conversationRead(id), {
            method: 'POST',
        });
    },

    getCommunityPresence: async (): Promise<{ onlineUserIds: string[] }> => {
        return await authenticatedFetch(authApi.endpoints.communityPresence, {
            method: 'GET',
        });
    },

    getNotifications: async (
        params: { page?: number; limit?: number; unreadOnly?: boolean } = {},
    ): Promise<any> => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.unreadOnly) query.append('unreadOnly', 'true');
        const qs = query.toString();
        return await authenticatedFetch(
            `${authApi.endpoints.notifications}${qs ? `?${qs}` : ''}`,
            { method: 'GET' },
        );
    },

    getNotificationsUnreadCount: async (): Promise<{ unreadCount: number }> => {
        return await authenticatedFetch(authApi.endpoints.notificationsUnreadCount, {
            method: 'GET',
        });
    },

    markNotificationRead: async (id: string): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.notificationRead(id), {
            method: 'PATCH',
        });
    },

    markAllNotificationsRead: async (): Promise<any> => {
        return await authenticatedFetch(authApi.endpoints.notificationsReadAll, {
            method: 'PATCH',
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

    resendOTP: async (data: { email?: string; userId?: string }): Promise<any> => {
        try {
            const payload: { email?: string; userId?: string } = {};
            if (data.email?.trim()) payload.email = data.email.trim();
            if (data.userId?.trim()) payload.userId = data.userId.trim();

            if (!payload.email && !payload.userId) {
                throw new Error('Email is required to resend the verification code');
            }

            const response = await fetch(`${ENV.API_URL}${authApi.endpoints.resendOTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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

export type Recommendation = {
    id: string;
    predictionId: string;
    farmId: string;
    type: 'crop' | 'fertilizer' | 'irrigation' | 'disease' | 'weather' | 'general';
    title: string;
    payload: Record<string, any>;
    rank: number;
    isPrimary: boolean;
    createdAt: string;
};

export type PredictionInput = {
    farmId: string;
    image: { uri: string; name: string; type: string };
    temperature: string;
    humidity: string;
    rainfall: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    cropType?: string;
    soilMoisture?: string;
};

export const predictionsApi = {
    run: async (input: PredictionInput): Promise<any> => {
        const formData = new FormData();
        const filename = input.image.name || `soil-${Date.now()}.jpg`;
        const type = input.image.type || 'image/jpeg';

        // Web needs a real Blob/File; native uses { uri, name, type }.
        if (typeof document !== 'undefined') {
            const response = await fetch(input.image.uri);
            const blob = await response.blob();
            formData.append('image', blob, filename);
        } else {
            formData.append('image', {
                uri: input.image.uri,
                name: filename,
                type,
            } as any);
        }

        formData.append('farmId', input.farmId);
        formData.append('temperature', input.temperature);
        formData.append('humidity', input.humidity);
        formData.append('rainfall', input.rainfall);
        formData.append('nitrogen', input.nitrogen);
        formData.append('phosphorus', input.phosphorus);
        formData.append('potassium', input.potassium);
        if (input.cropType) formData.append('crop_type', input.cropType);
        if (input.soilMoisture) formData.append('soil_moisture', input.soilMoisture);

        return await authenticatedFetch('/api/predictions/run', {
            method: 'POST',
            body: formData,
        });
    },

    getRecommendations: async (params: { farmId?: string; type?: string; page?: number; limit?: number } = {}): Promise<{ items: Recommendation[]; total: number; page: number; limit: number }> => {
        const query = new URLSearchParams();
        if (params.farmId) query.append('farmId', params.farmId);
        if (params.type) query.append('type', params.type);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        const qs = query.toString();
        return await authenticatedFetch(`/api/predictions/recommendations${qs ? `?${qs}` : ''}`, {
            method: 'GET',
        });
    },

    getRuns: async (params: { farmId?: string; page?: number; limit?: number } = {}): Promise<any> => {
        const query = new URLSearchParams();
        if (params.farmId) query.append('farmId', params.farmId);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        const qs = query.toString();
        return await authenticatedFetch(`/api/predictions/runs${qs ? `?${qs}` : ''}`, {
            method: 'GET',
        });
    },

    getDashboard: async (farmId: string, limit?: number): Promise<any> => {
        const query = new URLSearchParams({ farmId });
        if (limit) query.append('limit', String(limit));
        return await authenticatedFetch(`/api/predictions/dashboard?${query.toString()}`, {
            method: 'GET',
        });
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
