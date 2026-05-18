import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import io from 'socket.io-client';

import './CollaborativeEditor.css';
import ConnectionModal from './ConnectionModal';
import { authUtils } from '../lib/auth';
import Header from './Header';
import Footer from './Footer';
import CallNotification from './CallNotification';
import AudioControls from './AudioControls';
import Notification from './Notification';

// Backend server URL - change this to match your backend port
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const CollaborativeEditor = ({ initialRoomId }) => {
    // State management
    const [socket, setSocket] = useState(null);
    const [editorValue, setEditorValue] = useState('// Write your code here\nconsole.log("Hello World!");');
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId || '');
    const [currentUser, setCurrentUser] = useState(null);
    const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);
    const [cursors] = useState(new Map());
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isInCall, setIsInCall] = useState(false);
    const [callTimer, setCallTimer] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [peers] = useState(new Map());
    const [showConnectionModal, setShowConnectionModal] = useState(
        () => !(initialRoomId && authUtils.isAuthenticated())
    );
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [isConnected, setIsConnected] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [lastModified, setLastModified] = useState('Never modified');
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const [showCallNotification, setShowCallNotification] = useState(false);
    const [callerName, setCallerName] = useState('');
    const [showAudioControls, setShowAudioControls] = useState(false);
    const [callParticipants, setCallParticipants] = useState(0);
    const [callDuration, setCallDuration] = useState('00:00');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    // Connection state management
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const notificationHistoryRef = useRef(new Set());
    const notifiedJoinsRef = useRef(new Set());

    // Refs for cleanup and debouncing
    const updateTimeoutRef = useRef(null);
    const notificationTimeoutRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const connectionInProgressRef = useRef(false);
    const socketRef = useRef(null);
    const lastCodeUpdateRef = useRef('');

    // Language extension mapping
    const languageExtensions = {
        javascript: [javascript()],
        python: [python()],
        java: [java()],
        cpp: [cpp()]
    };

    // Extract user data from token
    const getUserFromToken = useCallback((token) => {
        if (!token || token.trim() === '') {
            throw new Error('Token is required');
        }

        let userName = null;
        let email = null;
        let role = 'user';
        let userId = null;
        let decodedPayload = null;

        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                let payload = parts[1];
                while (payload.length % 4) {
                    payload += '=';
                }

                decodedPayload = JSON.parse(atob(payload));
                console.log('Decoded JWT payload:', decodedPayload);

                userId = decodedPayload._id ||
                    decodedPayload.id ||
                    decodedPayload.sub ||
                    decodedPayload.user_id ||
                    decodedPayload.userId;

                userName = decodedPayload.name ||
                    decodedPayload.username ||
                    decodedPayload.displayName ||
                    null;

                email = decodedPayload.email || null;
                role = decodedPayload.role || 'user';

                // Check token expiry
                const now = Math.floor(Date.now() / 1000);
                if (decodedPayload.exp && decodedPayload.exp < now) {
                    throw new Error('Token has expired. Please login again.');
                }

            } else {
                throw new Error('Invalid JWT format - not 3 parts');
            }
        } catch (e) {
            console.log('JWT parsing failed:', e.message);
            throw new Error('Invalid JWT token format: ' + e.message);
        }

        if (!userId) {
            throw new Error('No user ID found in JWT token. Token must contain _id, id, sub, or user_id field.');
        }

        return {
            id: userId,
            name: userName,
            email: email,
            role: role,
            token: token,
            isValid: true,
            rawPayload: decodedPayload
        };
    }, []);

    const dismissNotification = useCallback(() => {
        setNotification({ show: false, message: '', type: 'info' });
    }, []);

    const showNotificationMessage = useCallback((message, type = 'info') => {
        const notificationKey = `${message}-${type}`;

        setNotification({ show: true, message, type });

        if (notificationHistoryRef.current.has(notificationKey)) {
            return;
        }
        notificationHistoryRef.current.add(notificationKey);
        setTimeout(() => {
            notificationHistoryRef.current.delete(notificationKey);
        }, 8000);
    }, []);

    const applyOnlineUsers = useCallback((users) => {
        if (!Array.isArray(users)) return;
        setOnlineUsers(users);
        setParticipantCount(users.length);
    }, []);

    // Connect to collaborative session - SINGLE CONNECTION POINT
    const connectToSession = useCallback((roomId) => {
        // Prevent multiple simultaneous connection attempts
        if (connectionInProgressRef.current) {
            console.log('Connection already in progress, ignoring duplicate attempt');
            return;
        }

        const token = authUtils.getToken();
        if (!token) {
            showNotificationMessage('Please sign in to join a session', 'error');
            return;
        }

        if (!roomId) {
            showNotificationMessage('Please enter room ID', 'error');
            return;
        }

        connectionInProgressRef.current = true;
        setIsConnecting(true);
        setShowConnectionModal(false);

        console.log('Connecting to session:', roomId);

        if (socketRef.current) {
            console.log('Cleaning up existing socket connection');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setCurrentRoomId(roomId);
        setCurrentUser(null);

        // Initialize Socket.IO connection to backend server
        const socketInstance = io(BACKEND_URL, {
            auth: { token },
            withCredentials: true,
            transports: ['polling', 'websocket'],
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        const joinRoom = () => {
            if (socketInstance.connected && roomId) {
                socketInstance.emit('join-session', { roomId });
            }
        };

        socketRef.current = socketInstance;

        // Connection event handlers
        socketInstance.on('connect', () => {
            console.log('Connected to server successfully');
            connectionInProgressRef.current = false;
            setIsConnecting(false);
            setConnectionAttempts(0);
            updateConnectionStatus('Connected', true);

            joinRoom();
        });

        socketInstance.io.on('reconnect', () => {
            joinRoom();
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            connectionInProgressRef.current = false;
            setIsConnecting(false);
            updateConnectionStatus('Disconnected', false);
            setOnlineUsers([]);

            if (reason === 'io server disconnect') {
                showNotificationMessage('Session ended. Please sign in again.', 'error');
            }
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Connection error:', error);
            connectionInProgressRef.current = false;
            setIsConnecting(false);
            setShowConnectionModal(true);

            const msg = error.message || 'Unknown error';
            if (/expired|invalid token|access token/i.test(msg)) {
                showNotificationMessage('Session invalid. Please log out and sign in again.', 'error');
                authUtils.clearAuth();
            } else {
                showNotificationMessage(
                    `Cannot reach server at ${BACKEND_URL}. Is the backend running? (${msg})`,
                    'error'
                );
            }
            updateConnectionStatus('Connection Failed', false);
        });

        // Session event handlers
        socketInstance.on('session-joined', (data) => {
            console.log('Joined session successfully:', data);
            setShowConnectionModal(false);

            if (data.user && data.user.name) {
                setCurrentUser(data.user);
                console.log('Got user info from server:', data.user);
            } else {
                console.error('Server did not provide user info:', data);
                setCurrentUser({ name: 'Unknown User', id: 'unknown' });
            }

            if (data.onlineUsers?.length) {
                applyOnlineUsers(data.onlineUsers);
            } else if (data.user?._id) {
                applyOnlineUsers([{
                    _id: data.user._id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role
                }]);
            } else if (data.connectedUsers?.length) {
                const storedUser = authUtils.getCurrentUser();
                const fallback = data.connectedUsers.map((id) => {
                    const sid = id.toString();
                    if (storedUser && (storedUser._id?.toString() === sid || storedUser.id?.toString() === sid)) {
                        return { _id: sid, name: storedUser.name, email: storedUser.email };
                    }
                    if (data.user && data.user._id?.toString() === sid) {
                        return data.user;
                    }
                    return { _id: sid, name: `User ${sid.slice(-4)}` };
                });
                applyOnlineUsers(fallback);
            }

            // Update editor content only if it's different
            const newCode = data.code || '';
            if (newCode !== lastCodeUpdateRef.current) {
                setIsUpdatingFromRemote(true);
                setEditorValue(newCode);
                lastCodeUpdateRef.current = newCode;
                setTimeout(() => setIsUpdatingFromRemote(false), 100);
            }

            showNotificationMessage(
                `Welcome ${data.user?.name || 'collaborator'}! Connected to session.`,
                'success'
            );
            setLanguageMode(data.language || 'javascript');

            const newUrl = `${window.location.pathname}?name=${encodeURIComponent(data.user.name)}&room=${encodeURIComponent(roomId)}`;
            window.history.replaceState({}, '', newUrl);
        });

        socketInstance.on('user-joined', (data) => {
            console.log('User joined:', data);
            if (data.onlineUsers) {
                applyOnlineUsers(data.onlineUsers);
            }
            if (data.user?._id) {
                const joinedId = data.user._id.toString();
                const selfId = currentUser?._id?.toString();
                if (joinedId !== selfId && !notifiedJoinsRef.current.has(joinedId)) {
                    notifiedJoinsRef.current.add(joinedId);
                    showNotificationMessage(`${data.user.name} joined the session`, 'info');
                }
            }
        });

        socketInstance.on('user-left', (data) => {
            console.log('User left:', data);
            if (data.onlineUsers) {
                applyOnlineUsers(data.onlineUsers);
            }
            if (data.user?._id) {
                const leftId = data.user._id.toString();
                const selfId = currentUser?._id?.toString();
                if (leftId !== selfId) {
                    showNotificationMessage(`${data.user.name} left the session`, 'info');
                }
                removeCursor(data.user._id);
            }
        });

        socketInstance.on('code-updated', (data) => {
            console.log('Code updated by:', data.author.name);

            // Prevent update loops by checking if content is different
            if (data.code !== lastCodeUpdateRef.current) {
                setIsUpdatingFromRemote(true);
                setEditorValue(data.code);
                lastCodeUpdateRef.current = data.code;

                if (data.language) {
                    setLanguageMode(data.language);
                }

                updateLastModifiedInfo(data.author.name, data.timestamp);
                setTimeout(() => setIsUpdatingFromRemote(false), 100);
            }
        });

        socketInstance.on('cursor-updated', (data) => {
            updateCursor(data.userId, data.userName, data.cursorPosition, data.selection);
        });

        socketInstance.on('language-updated', (data) => {
            setLanguageMode(data.language);
            showNotificationMessage(`Language changed to ${data.language} by ${data.changedBy.name}`, 'info');
        });

        socketInstance.on('error', (data) => {
            console.error('Socket error:', data);
            showNotificationMessage(data.message, 'error');
        });

        // Voice calling event handlers (keeping existing implementation)
        socketInstance.on('call-started', (data) => {
            console.log('Call started:', data);
            if (data.startedBy._id !== currentUser?._id) {
                showCallNotificationDialog(data.startedBy.name);
            }
        });

        socketInstance.on('user-joined-call', (data) => {
            console.log('User joined call:', data);
            showNotificationMessage(`${data.user.name} joined the call`, 'info');
            setCallParticipants(data.participantCount);
        });

        socketInstance.on('user-left-call', (data) => {
            console.log('User left call:', data);
            showNotificationMessage(`${data.user.name} left the call`, 'info');
            setCallParticipants(data.participantCount);

            if (peers.has(data.user._id)) {
                peers.get(data.user._id).destroy();
                peers.delete(data.user._id);
            }

            if (data.callEnded) {
                handleCallEnded();
            }
        });

        socketInstance.on('call-ended', (data) => {
            console.log('Call ended:', data);
            showNotificationMessage(`Call ended by ${data.endedBy.name}. Duration: ${formatDuration(data.duration)}`, 'info');
            handleCallEnded();
        });

        socketInstance.on('call-joined', (data) => {
            console.log('Successfully joined call:', data);
            setIsInCall(true);
            startCallTimer();
            setCallParticipants(data.participantCount);
            setShowAudioControls(true);
        });

        socketInstance.on('call-left', (data) => {
            console.log('Left call:', data);
            if (data.callEnded) {
                showNotificationMessage(`Call ended. Duration: ${formatDuration(data.duration)}`, 'info');
            }
            handleCallEnded();
        });

        setSocket(socketInstance);
    }, [applyOnlineUsers, showNotificationMessage]);

    const connectToSessionRef = useRef(connectToSession);
    connectToSessionRef.current = connectToSession;

    // Connect when entering a room (handles React Strict Mode remounts)
    useEffect(() => {
        const room =
            initialRoomId ||
            new URLSearchParams(window.location.search).get('room');

        if (room) {
            setCurrentRoomId(room);
        }

        if (!room || !authUtils.getToken()) {
            if (room && !authUtils.getToken()) {
                setShowConnectionModal(true);
            }
            return;
        }

        const timer = setTimeout(() => {
            connectToSessionRef.current(room);
        }, 100);

        return () => {
            clearTimeout(timer);
            connectionInProgressRef.current = false;
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
        };
    }, [initialRoomId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            connectionInProgressRef.current = false;
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Handle editor changes with debouncing and loop prevention
    const handleEditorChange = useCallback((value) => {
        if (!isUpdatingFromRemote && socket && currentRoomId && value !== lastCodeUpdateRef.current) {
            // Clear existing timeout
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }

            // Update local state immediately
            setEditorValue(value);

            // Debounce server updates
            updateTimeoutRef.current = setTimeout(() => {
                if (socket.connected) {
                    lastCodeUpdateRef.current = value;
                    socket.emit('code-change', {
                        roomId: currentRoomId,
                        code: value,
                        language: language,
                        change: { origin: 'user' }
                    });
                }
            }, 500); // Increased debounce time
        }
    }, [isUpdatingFromRemote, socket, currentRoomId, language]);

    // Handle cursor activity
    const handleCursorActivity = useCallback((view) => {
        if (!isUpdatingFromRemote && socket && currentRoomId && socket.connected) {
            const cursor = view.state.selection.main.head;
            const line = view.state.doc.lineAt(cursor);
            const ch = cursor - line.from;
            const cursorPos = { line: line.number - 1, ch };
            const selection = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);

            socket.emit('cursor-update', {
                roomId: currentRoomId,
                cursorPosition: cursorPos,
                selection: selection
            });
        }
    }, [isUpdatingFromRemote, socket, currentRoomId]);

    // Update connection status
    const updateConnectionStatus = useCallback((status, connected) => {
        setConnectionStatus(status);
        setIsConnected(connected);
    }, []);

    // Get avatar color based on user name
    const getAvatarColor = useCallback((name) => {
        const colors = [
            '#007ACC', '#FF6B6B', '#4ECDC4', '#45B7D1',
            '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, []);

    // Change programming language
    const changeLanguage = useCallback((newLanguage) => {
        setLanguage(newLanguage);
        if (socket && currentRoomId && socket.connected) {
            socket.emit('language-change', {
                roomId: currentRoomId,
                language: newLanguage
            });
        }
    }, [socket, currentRoomId]);

    // Set editor language mode
    const setLanguageMode = useCallback((lang) => {
        setLanguage(lang);
    }, []);

    // Update cursor position for other users
    const updateCursor = useCallback((userId, userName, position, selection) => {
        removeCursor(userId);
        // Note: Cursor visualization would need to be implemented with CodeMirror 6 extensions
    }, []);

    // Remove cursor for user
    const removeCursor = useCallback((userId) => {
        const cursor = cursors.get(userId);
        if (cursor) {
            cursors.delete(userId);
        }
    }, [cursors]);

    // Update last modified info
    const updateLastModifiedInfo = useCallback((authorName, timestamp) => {
        const time = new Date(timestamp).toLocaleTimeString();
        setLastModified(`Modified by ${authorName} at ${time}`);
    }, []);

    // Voice calling functions
    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalStream(stream);
            socket.emit('start-call', { roomId: currentRoomId });

            setIsInCall(true);
            startCallTimer();
            setShowAudioControls(true);

            showNotificationMessage('Call started! Waiting for others to join...', 'info');

        } catch (error) {
            console.error('Error starting call:', error);
            showNotificationMessage('Could not access microphone. Please check permissions.', 'error');
        }
    };

    const joinCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalStream(stream);
            socket.emit('join-call', { roomId: currentRoomId });

        } catch (error) {
            console.error('Error joining call:', error);
            showNotificationMessage('Could not access microphone. Please check permissions.', 'error');
        }
    };

    const leaveCall = () => {
        socket.emit('leave-call', { roomId: currentRoomId });
        handleCallEnded();
    };

    const endCall = () => {
        socket.emit('end-call', { roomId: currentRoomId });
    };

    const handleCallEnded = useCallback(() => {
        setIsInCall(false);
        stopCallTimer();

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        peers.forEach(peer => peer.destroy());
        peers.clear();

        setShowAudioControls(false);
        setShowCallNotification(false);
    }, [localStream, peers]);

    const startCallTimer = useCallback(() => {
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setCallDuration(formatDuration(elapsed));
        }, 1000);
        setCallTimer(timer);
    }, []);

    const stopCallTimer = useCallback(() => {
        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }
        setCallDuration('00:00');
    }, [callTimer]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const showCallNotificationDialog = (caller) => {
        setCallerName(caller);
        setShowCallNotification(true);

        setTimeout(() => {
            setShowCallNotification(false);
        }, 30000);
    };

    const acceptCall = () => {
        setShowCallNotification(false);
        joinCall();
    };

    const declineCall = () => {
        setShowCallNotification(false);
    };

    const runCode = async () => {
        const code = editorValue || '';
        setIsRunning(true);
        setOutput('Running...');

        try {
            const token = authUtils.getToken();
            const res = await fetch(`${BACKEND_URL}/api/editor/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    source_code: code,
                    language_id: language,
                    stdin: '',
                }),
                credentials: 'include',
            });

            let result;
            try {
                result = await res.json();
            } catch {
                result = { stderr: await res.text() || `HTTP ${res.status}` };
            }

            if (!res.ok) {
                setOutput(
                    result.stderr ||
                    result.message ||
                    `Run failed (${res.status})`
                );
                return;
            }

            const parts = [];
            if (result.stdout) parts.push(result.stdout);
            if (result.stderr) parts.push(`Error:\n${result.stderr}`);
            if (result.compile_output) parts.push(`Compiler:\n${result.compile_output}`);
            if (parts.length === 0) {
                parts.push(result.status || 'No output');
            }
            setOutput(parts.join('\n').trim());
        } catch (err) {
            console.error('Run error:', err);
            setOutput(
                `Error: ${err.message}\n\nMake sure the backend is running at ${BACKEND_URL}`
            );
        } finally {
            setIsRunning(false);
        }
    };

    // CodeMirror extensions
    const extensions = [
        languageExtensions[language] || languageExtensions.javascript,
        oneDark,
        EditorView.theme({
            '&': {
                fontSize: '14px',
                height: '100%'
            },
            '.cm-content': {
                padding: '12px',
                minHeight: '400px'
            },
            '.cm-focused': {
                outline: 'none'
            },
            '.cm-editor': {
                height: '100%'
            },
            '.cm-scroller': {
                height: '100%'
            }
        }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
            if (update.selectionSet && !isUpdatingFromRemote) {
                handleCursorActivity(update.view);
            }
        })
    ].flat();

    return (
        <div className="collaborative-editor">
            {showConnectionModal && (
                <ConnectionModal
                    onConnect={connectToSession}
                    initialRoomId={currentRoomId || initialRoomId}
                    isConnecting={isConnecting}
                />
            )}

            <Header
                connectionStatus={connectionStatus}
                isConnected={isConnected}
                currentRoomId={currentRoomId}
                language={language}
                onLanguageChange={changeLanguage}
                onlineUsers={onlineUsers}
                currentUserId={currentUser?._id}
                getAvatarColor={getAvatarColor}
                isInCall={isInCall}
                onCallAction={isInCall ? leaveCall : startCall}
                callDuration={callDuration}
                callParticipants={callParticipants}
                onRunCode={runCode}
                isRunning={isRunning}
                isConnecting={isConnecting}
                onReconnect={() => {
                    const room = currentRoomId || initialRoomId;
                    if (room) connectToSessionRef.current(room);
                }}
            />

            <div className="editor-container">
                <CodeMirror
                    value={editorValue}
                    onChange={handleEditorChange}
                    extensions={extensions}
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        dropCursor: false,
                        allowMultipleSelections: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        highlightSelectionMatches: false,
                        searchKeymap: true,
                    }}
                />
            </div>

            <div className="output-section">
                <h3>Output</h3>
                <pre id="output">{output}</pre>
            </div>

            <Footer
                connectionStatus={connectionStatus}
                participantCount={participantCount}
                lastModified={lastModified}
                onlineUsers={onlineUsers}
            />

            {showCallNotification && (
                <CallNotification
                    callerName={callerName}
                    onAccept={acceptCall}
                    onDecline={declineCall}
                />
            )}

            {showAudioControls && (
                <AudioControls
                    onEndCall={endCall}
                />
            )}

            <Notification
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={3500}
                onClose={dismissNotification}
            />
        </div>
    );
};

export default CollaborativeEditor;