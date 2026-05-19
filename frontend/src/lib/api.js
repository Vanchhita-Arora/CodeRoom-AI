import { authUtils } from './auth.js';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:5001/api';

class ApiClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = authUtils.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'cookie-auth-token' && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            credentials: 'include', // Include cookies for session management
            ...options,
        };

        try {
            const response = await fetch(url, config);

            // Handle non-JSON responses
            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                // If unauthorized, clear auth data
                if (response.status === 401) {
                    authUtils.clearAuth();
                }
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication
    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        // Store token and user info
        if (response.token) {
            authUtils.setToken(response.token);
        }
        if (response.user) {
            authUtils.setCurrentUser(response.user);
        }

        return response;
    }

    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        // Store token and user info after registration
        if (response.token) {
            authUtils.setToken(response.token);
        }
        if (response.data) {
            authUtils.setCurrentUser(response.data);
        }

        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST',
            });
        } finally {
            // Always clear local auth data
            authUtils.clearAuth();
        }
    }

    // Session Management
    async getSession(roomId) {
        return this.request(`/session/${roomId}`);
    }

    async joinSession(roomId) {
        return this.request(`/session/join/${roomId}`, {
            method: 'POST',
        });
    }

    async createSession(sessionData) {
        return this.request('/session', {
            method: 'POST',
            body: JSON.stringify(sessionData),
        });
    }

    // Get current user info from backend using token
    async getCurrentUserInfo() {
        return this.request('/auth/me');
    }
}

// Create and export the instance
export const apiClient = new ApiClient();

// Export auth utilities for backward compatibility
export {
    authUtils,
    getUserToken,
    getCurrentUser,
    setUserToken,
    setCurrentUser,
    clearAuth,
    isAuthenticated,
    isTA,
    getUserFromToken
} from './auth.js';

// Export default
export default apiClient;