import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getUserToken, getCurrentUser } from '@/lib/auth';

export const useSocket = ({
    roomId,
    onCodeUpdate,
    onUserJoined,
    onUserLeft,
    onParticipantsUpdate,
    onLanguageUpdate,
    onCursorUpdate,
}) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const connectionAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const isConnectingRef = useRef(false);

    useEffect(() => {
        const token = getUserToken();
        const currentUser = getCurrentUser();

        if (!token || !currentUser) {
            console.error('No authentication token found');
            return;
        }

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('Connection already in progress, skipping');
            return;
        }

        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Disconnect existing socket if any
        if (socketRef.current) {
            console.log('Cleaning up existing socket connection');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        isConnectingRef.current = true;

        // Initialize socket connection
        socketRef.current = io(window.location.origin, {
            auth: {
                token: token
            },
            transports: ['polling', 'websocket'],
            timeout: 30000,
            forceNew: true,
            reconnection: false, // Disable automatic reconnection to prevent loops
            upgrade: true,
            rememberUpgrade: false
        });

        const socket = socketRef.current;

        // Connection event handlers
        socket.on('connect', () => {
            console.log('Connected to server');
            isConnectingRef.current = false;
            connectionAttemptRef.current = 0;
            setIsConnected(true);
            setConnectionStatus('Connected');

            if (roomId) {
                // Add a small delay to ensure socket is fully ready
                setTimeout(() => {
                    socket.emit('join-session', { roomId });
                }, 100);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            isConnectingRef.current = false;
            setIsConnected(false);
            setConnectionStatus('Disconnected');

            // Only attempt reconnection for certain disconnect reasons and limit attempts
            if (reason !== 'io client disconnect' && connectionAttemptRef.current < 3) {
                connectionAttemptRef.current++;
                const delay = Math.min(1000 * Math.pow(2, connectionAttemptRef.current), 10000); // Exponential backoff, max 10s

                console.log(`Attempting reconnection ${connectionAttemptRef.current}/3 in ${delay}ms`);
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (!isConnectingRef.current && !socketRef.current?.connected) {
                        // Trigger re-render to reconnect
                        setConnectionStatus('Reconnecting...');
                    }
                }, delay);
            } else if (connectionAttemptRef.current >= 3) {
                console.log('Max reconnection attempts reached');
                setConnectionStatus('Connection Failed');
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            isConnectingRef.current = false;
            setConnectionStatus('Connection Failed');

            if (error.message?.includes('Token has expired') || error.message?.includes('Token expires soon')) {
                console.log('Token expired, redirecting to login');
                // Handle token expiration
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.reload();
            }
        });

        // Session event handlers
        socket.on('session-joined', (data) => {
            console.log('Joined session:', data);
            setParticipants(data.participants || []);
            onParticipantsUpdate?.(data.participants || []);
        });

        socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            setParticipants(prev => {
                // Prevent duplicate participants
                const exists = prev.some(p => p._id === data.user._id);
                if (!exists) {
                    return [...prev, data.user];
                }
                return prev;
            });
            onUserJoined?.(data.user);
            onParticipantsUpdate?.(data.participants || []);
        });

        socket.on('user-left', (data) => {
            console.log('User left:', data);
            setParticipants(prev => prev.filter(p => p._id !== data.user._id));
            onUserLeft?.(data.user);
            onParticipantsUpdate?.(data.participants || []);
        });

        socket.on('code-updated', (data) => {
            console.log('Code updated:', data);
            onCodeUpdate?.(data.code, data.author);
        });

        socket.on('language-updated', (data) => {
            console.log('Language updated:', data);
            onLanguageUpdate?.(data.language);
        });

        socket.on('cursor-updated', (data) => {
            onCursorUpdate?.(data.userId, data.userName, data.cursorPosition);
        });

        socket.on('error', (data) => {
            console.error('Socket error:', data);
        });

        socket.on('token-expiring', (data) => {
            console.warn('Token expiring:', data);
            // Could show a warning to the user
        });

        socket.on('token-expired', (data) => {
            console.error('Token expired:', data);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.reload();
        });

        return () => {
            isConnectingRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [roomId, onCodeUpdate, onUserJoined, onUserLeft, onParticipantsUpdate, onLanguageUpdate, onCursorUpdate]);

    // Socket methods
    const emitCodeChange = (code, language) => {
        if (socketRef.current?.connected && roomId) {
            socketRef.current.emit('code-change', {
                roomId,
                code,
                language
            });
        }
    };

    const emitLanguageChange = (language) => {
        if (socketRef.current?.connected && roomId) {
            socketRef.current.emit('language-change', {
                roomId,
                language
            });
        }
    };

    const emitCursorUpdate = (cursorPosition, selection) => {
        if (socketRef.current?.connected && roomId) {
            socketRef.current.emit('cursor-update', {
                roomId,
                cursorPosition,
                selection
            });
        }
    };

    return {
        socket: socketRef.current,
        isConnected,
        participants,
        connectionStatus,
        emitCodeChange,
        emitLanguageChange,
        emitCursorUpdate,
    };
};