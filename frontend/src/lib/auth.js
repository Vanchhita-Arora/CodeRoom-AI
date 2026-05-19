import React from 'react';

// Frontend authentication utilities
// This handles client-side authentication logic for React

// API base URL - adjust this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

// Token management
export const tokenManager = {
    // Get token from localStorage
    getToken: () => {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    },

    // Set token in localStorage
    setToken: (token, remember = false) => {
        if (remember) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }
    },

    // Remove token
    removeToken: () => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    },

    // Check if token exists
    hasToken: () => {
        return !!(tokenManager.getToken());
    }
};

// User management
export const userManager = {
    // Get user data from localStorage
    getUser: () => {
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    },

    // Set user data
    setUser: (userData, remember = false) => {
        const userString = JSON.stringify(userData);
        if (remember) {
            localStorage.setItem('userData', userString);
        } else {
            sessionStorage.setItem('userData', userString);
        }
    },

    // Remove user data
    removeUser: () => {
        localStorage.removeItem('userData');
        sessionStorage.removeItem('userData');
    }
};

// Legacy function exports for backward compatibility
export const getUserToken = () => tokenManager.getToken();
export const getCurrentUser = () => userManager.getUser();
export const setUserToken = (token, remember = false) => tokenManager.setToken(token, remember);
export const setCurrentUser = (userData, remember = false) => userManager.setUser(userData, remember);
export const clearAuth = () => {
    tokenManager.removeToken();
    userManager.removeUser();
};
export const isAuthenticated = () => tokenManager.hasToken();

// Additional legacy functions
export const isTA = () => {
    const user = getCurrentUser();
    return user && (user.role === 'TA' || user.role === 'teacher' || user.role === 'admin');
};

export const getUserFromToken = () => {
    const token = getUserToken();
    if (!token) return null;

    try {
        // Simple token parsing (this is just for basic info, real validation should be on backend)
        const payload = token.split('.')[1];
        if (payload) {
            const decoded = JSON.parse(atob(payload));
            return decoded;
        }
    } catch (error) {
        console.error('Error parsing token:', error);
    }

    return getCurrentUser();
};

// API request helper with authentication
export const authenticatedRequest = async (endpoint, options = {}) => {
    const token = tokenManager.getToken();

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle token expiration
        if (response.status === 401) {
            clearAuth();
            window.location.href = '/login';
            throw new Error('Token expired. Please login again.');
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Authentication functions
export const authService = {
    // Login function
    login: async (credentials) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setUserToken(data.token, credentials.remember);
                if (data.user) {
                    setCurrentUser(data.user, credentials.remember);
                }
                return { success: true, data };
            } else {
                return { success: false, error: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    // Register function
    register: async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, data };
            } else {
                return { success: false, error: data.message || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    // Logout function
    logout: async () => {
        try {
            // Call backend logout endpoint if it exists
            const token = getUserToken();
            if (token) {
                await fetch(`${API_BASE_URL}/api/users/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local storage
            clearAuth();
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return isAuthenticated();
    },

    // Get current user
    getCurrentUser: () => {
        return getCurrentUser();
    },

    // Verify token with backend
    verifyToken: async () => {
        try {
            const response = await authenticatedRequest('/api/users/verify');
            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, user: data.user };
            } else {
                clearAuth();
                return { success: false };
            }
        } catch (error) {
            console.error('Token verification error:', error);
            clearAuth();
            return { success: false };
        }
    }
};

// Legacy authUtils export for backward compatibility
export const authUtils = {
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    getToken: getUserToken,
    setToken: setUserToken,
    setCurrentUser: setCurrentUser,
    clearAuth: clearAuth,
    login: authService.login,
    logout: authService.logout,
    verifyToken: authService.verifyToken
};

// Higher-order component for protected routes
export const withAuth = (WrappedComponent) => {
    return function AuthenticatedComponent(props) {
        const authenticated = isAuthenticated();

        if (!authenticated) {
            window.location.href = '/login';
            return null;
        }

        return React.createElement(WrappedComponent, props);
    };
};

// Hook for authentication state
export const useAuth = () => {
    const [authenticated, setAuthenticated] = React.useState(isAuthenticated());
    const [user, setUser] = React.useState(getCurrentUser());

    const login = async (credentials) => {
        const result = await authService.login(credentials);
        if (result.success) {
            setAuthenticated(true);
            setUser(getCurrentUser());
        }
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setAuthenticated(false);
        setUser(null);
    };

    const verifyToken = async () => {
        const result = await authService.verifyToken();
        setAuthenticated(result.success);
        if (result.success) {
            setUser(result.user);
        } else {
            setUser(null);
        }
        return result;
    };

    return {
        isAuthenticated: authenticated,
        user,
        login,
        logout,
        verifyToken
    };
};

export default authService;