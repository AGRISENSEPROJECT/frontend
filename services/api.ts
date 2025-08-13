import ENV from '@/config/env';

export const authApi = {
    signup: async (data: SignupData) => {
        try {
            const response = await fetch(`${ENV.API_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return await response.json();
        } catch (error) {
            throw new Error('Network error');
        }
    },

    signin: async (data: SigninData) => {
        try {
            const response = await fetch(`${ENV.API_URL}/auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return await response.json();
        } catch (error) {
            throw new Error('Network error');
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
