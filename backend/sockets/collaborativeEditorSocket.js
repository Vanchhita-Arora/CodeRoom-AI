const Session = require('../models/sessionModel');
const { activeEditorSessions } = require('../controllers/collaborativeEditorController');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
const User = require('../models/userModel');
const Call = require('../models/callModel');

// Track active socket connections to prevent duplicates
const activeConnections = new Map();
const userSessions = new Map(); // Track user sessions to prevent loops

// Build online user list from in-memory profiles (fast) with DB fallback
const getOnlineUsersPayload = async (activeSession) => {
    if (!activeSession || activeSession.connectedUsers.size === 0) {
        return [];
    }

    const ids = Array.from(activeSession.connectedUsers);
    const fromCache = ids
        .map((id) => activeSession.userProfiles?.get(id))
        .filter(Boolean);

    if (fromCache.length === ids.length) {
        return fromCache;
    }

    try {
        const users = await User.find({ _id: { $in: ids } }).select('name email role');
        return users.map((u) => {
            const profile = {
                _id: u._id,
                name: u.name,
                email: u.email,
                role: u.role || 'student'
            };
            activeSession.userProfiles.set(u._id.toString(), profile);
            return profile;
        });
    } catch (err) {
        console.warn('Could not load online users from DB:', err.message);
        return fromCache.length ? fromCache : ids.map((id) => ({
            _id: id,
            name: activeSession.userProfiles?.get(id)?.name || `User ${id.slice(-4)}`,
            email: activeSession.userProfiles?.get(id)?.email || ''
        }));
    }
};

// Socket authentication middleware - requires valid JWT token
const authenticateSocket = async (socket, next) => {
    try {
        // Try to get token from multiple sources: auth header, cookies, or query params
        let token = (socket.handshake.auth.token || '').trim() ||
            socket.handshake.headers.cookie?.split(';')
                .find(c => c.trim().startsWith('token='))
                ?.split('=')[1] ||
            socket.handshake.query.token ||
            socket.handshake.headers.authorization?.replace('Bearer ', '') ||
            socket.handshake.headers.authorization?.replace('bearer ', '');

        // Reject connection if no token provided
        if (!token || token.trim() === '') {
            return next(new Error('Access token is required'));
        }

        // Validate JWT token using the same logic as the auth middleware
        try {
            const decodeObj = jwt.verify(token.trim(), getJwtSecret());
            const { _id, exp } = decodeObj;

            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (exp && exp < now) {
                return next(new Error('Token has expired. Please login again.'));
            }

            // Check if token is about to expire (within 5 minutes)
            const timeUntilExpiry = exp - now;
            if (timeUntilExpiry < 300) { // Less than 5 minutes
                console.warn(`Token expires soon for user ${_id}: ${timeUntilExpiry} seconds left`);
            }

            // Find the user in the database
            const user = await User.findById(_id);
            if (!user) {
                return next(new Error('User not found - invalid token'));
            }

            // Check for existing connection from same user - DISCONNECT OLD ONE
            const existingSocketId = activeConnections.get(_id.toString());
            if (existingSocketId && existingSocketId !== socket.id) {
                console.log(`Disconnecting existing connection for user ${user.name}`);
                // Find and disconnect the old socket
                const existingSocket = socket.nsp.sockets.get(existingSocketId);
                if (existingSocket) {
                    existingSocket.disconnect(true);
                }
                activeConnections.delete(_id.toString());
            }

            // Set authenticated user data from database
            socket.user = {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || 'user',
                token: token,
                isAuthenticated: true,
                tokenExpiry: exp
            };

            // Track this connection
            activeConnections.set(_id.toString(), socket.id);

            console.log(`User ${socket.user.name} (${socket.user.email}) authenticated successfully`);
            next();

        } catch (jwtError) {
            // Handle specific JWT errors
            if (jwtError.name === 'TokenExpiredError') {
                return next(new Error('Token has expired. Please login again.'));
            } else if (jwtError.name === 'JsonWebTokenError') {
                return next(new Error('Invalid token format'));
            } else {
                return next(new Error('Token verification failed: ' + jwtError.message));
            }
        }

    } catch (error) {
        return next(new Error('Authentication failed: ' + error.message));
    }
};

// Handle collaborative editor events
const handleCollaborativeEditor = (io) => {
    // Authentication middleware for all socket connections
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        console.log(`User ${socket.user.name} connected to collaborative editor`);

        // Prevent multiple session joins for the same user
        const userId = socket.user._id.toString();
        let tokenCheckInterval;

        // Set up token expiry check - more lenient
        const checkTokenExpiry = () => {
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = socket.user.tokenExpiry - now;

            if (!socket.user.tokenExpiry) return;

            if (timeUntilExpiry < 300) {
                socket.emit('token-expiring', {
                    message: 'Your session will expire soon. Please refresh.',
                    secondsLeft: timeUntilExpiry
                });
            }

            if (timeUntilExpiry <= 0) {
                socket.emit('token-expired', { message: 'Session expired. Please login again.' });
                socket.disconnect(true);
            }
        };

        // Check token expiry every 60 seconds (less frequent)
        tokenCheckInterval = setInterval(checkTokenExpiry, 60000);

        // Join a coding session room
        socket.on('join-session', async (data) => {
            try {
                const { roomId } = data;

                const sessionKey = `${userId}-${roomId}`;
                const isDuplicateJoin = userSessions.has(sessionKey);

                // Try to find session in database, fallback to mock session
                let session;
                try {
                    session = await Session.findOne({ roomId })
                        .populate('participants', 'name email');

                    if (!session) {
                        const defaultCode = '// Welcome to collaborative editor\n// Anyone can edit and collaborate!\nconsole.log("Hello World!");';
                        session = {
                            roomId: roomId,
                            currentCode: defaultCode,
                            language: 'javascript',
                            participants: [socket.user]
                        };

                        try {
                            const newSession = new Session({
                                roomId: roomId,
                                title: `Session ${roomId}`,
                                currentCode: defaultCode,
                                language: session.language,
                                participants: [socket.user._id],
                                creator: socket.user._id
                            });
                            await newSession.save();
                            session = await Session.findOne({ roomId }).populate('participants', 'name email');
                        } catch (dbError) {
                            console.warn('Could not save session to database:', dbError.message);
                        }
                    } else {
                        // Add joining user to session participants in DB
                        try {
                            await Session.updateOne(
                                { roomId },
                                { $addToSet: { participants: socket.user._id } }
                            );
                            session = await Session.findOne({ roomId }).populate('participants', 'name email');
                        } catch (dbError) {
                            console.warn('Could not update session participants:', dbError.message);
                        }
                    }
                } catch (dbError) {
                    console.warn('Database error, using mock session:', dbError.message);
                    // Fallback to mock session
                    session = {
                        roomId: roomId,
                        currentCode: '// Welcome to collaborative editor\n// Anyone can edit and collaborate!\nconsole.log("Hello World!");',
                        language: 'javascript',
                        participants: [socket.user]
                    };
                }

                // Leave any previous room first
                if (socket.currentRoom && socket.currentRoom !== roomId) {
                    socket.leave(socket.currentRoom);
                    const prevActiveSession = activeEditorSessions.get(socket.currentRoom);
                    if (prevActiveSession && socket.user._id) {
                        prevActiveSession.connectedUsers.delete(socket.user._id.toString());
                    }
                    const prevSessionKey = `${userId}-${socket.currentRoom}`;
                    userSessions.delete(prevSessionKey);
                }

                socket.join(roomId);
                socket.currentRoom = roomId;
                userSessions.set(sessionKey, Date.now());

                let activeSession = activeEditorSessions.get(roomId);
                if (!activeSession) {
                    activeSession = {
                        code: session.currentCode || '',
                        language: session.language || 'javascript',
                        participants: session.participants,
                        cursors: new Map(),
                        connectedUsers: new Set(),
                        userProfiles: new Map()
                    };
                    activeEditorSessions.set(roomId, activeSession);
                }

                if (!activeSession.userProfiles) {
                    activeSession.userProfiles = new Map();
                }

                const userIdStr = socket.user._id.toString();
                const wasAlreadyConnected = activeSession.connectedUsers.has(userIdStr);
                activeSession.connectedUsers.add(userIdStr);
                activeSession.userProfiles.set(userIdStr, {
                    _id: socket.user._id,
                    name: socket.user.name,
                    email: socket.user.email,
                    role: socket.user.role || 'student'
                });

                const onlineUsers = await getOnlineUsersPayload(activeSession);

                if (!isDuplicateJoin && !wasAlreadyConnected) {
                    setTimeout(async () => {
                        const updatedOnline = await getOnlineUsersPayload(activeSession);
                        socket.to(roomId).emit('user-joined', {
                            user: {
                                _id: socket.user._id,
                                name: socket.user.name,
                                email: socket.user.email,
                                role: socket.user.role
                            },
                            connectedUsers: Array.from(activeSession.connectedUsers),
                            onlineUsers: updatedOnline
                        });
                    }, 100);
                }

                socket.emit('session-joined', {
                    roomId,
                    code: activeSession.code,
                    language: activeSession.language,
                    participants: session.participants,
                    connectedUsers: Array.from(activeSession.connectedUsers),
                    onlineUsers,
                    user: socket.user
                });

            } catch (error) {
                console.error('Error joining session:', error);
                socket.emit('error', { message: 'Failed to join session: ' + error.message });
            }
        });

        // Handle real-time code changes
        socket.on('code-change', async (data) => {
            try {
                const { roomId, code, language, change } = data;

                if (socket.currentRoom !== roomId) {
                    socket.emit('error', { message: 'Not connected to this session' });
                    return;
                }

                // Update active session
                const activeSession = activeEditorSessions.get(roomId);
                if (activeSession) {
                    activeSession.code = code;
                    activeSession.language = language || activeSession.language;
                    activeSession.lastModified = new Date();
                }

                // Broadcast changes to other users in the room
                socket.to(roomId).emit('code-updated', {
                    code,
                    language: language || activeSession?.language,
                    change,
                    author: {
                        _id: socket.user._id,
                        name: socket.user.name
                    },
                    timestamp: new Date()
                });

                // Update database every few seconds (debounced)
                clearTimeout(socket.saveTimeout);
                socket.saveTimeout = setTimeout(async () => {
                    try {
                        const session = await Session.findOne({ roomId });
                        if (session) {
                            session.currentCode = code;
                            session.language = language || session.language;
                            session.lastModified = new Date();
                            session.lastModifiedBy = socket.user._id;

                            // Add to history if significant change
                            if (code.length > (session.currentCode?.length || 0) + 50 ||
                                code.length < (session.currentCode?.length || 0) - 50) {
                                session.codeHistory.push({
                                    code,
                                    timestamp: new Date(),
                                    author: socket.user._id,
                                    language: language || session.language
                                });
                            }

                            await session.save();
                        }
                    } catch (error) {
                        console.error('Error saving code to database:', error);
                    }
                }, 3000); // Save to DB after 3 seconds of inactivity

            } catch (error) {
                console.error('Error handling code change:', error);
                socket.emit('error', { message: 'Failed to process code change' });
            }
        });

        // Handle cursor position updates
        socket.on('cursor-update', (data) => {
            try {
                const { roomId, cursorPosition, selection } = data;

                if (socket.currentRoom !== roomId) {
                    return;
                }

                const activeSession = activeEditorSessions.get(roomId);
                if (activeSession) {
                    // Ensure user ID exists before setting cursor
                    const userId = socket.user._id;
                    if (userId) {
                        activeSession.cursors.set(userId.toString(), {
                            userId: userId.toString(),
                            userName: socket.user.name,
                            cursorPosition,
                            selection,
                            timestamp: new Date()
                        });
                    }

                    // Broadcast cursor position to other users
                    socket.to(roomId).emit('cursor-updated', {
                        userId: socket.user._id,
                        userName: socket.user.name,
                        cursorPosition,
                        selection
                    });
                }
            } catch (error) {
                console.error('Error updating cursor:', error);
            }
        });

        // Handle language change
        socket.on('language-change', async (data) => {
            try {
                const { roomId, language } = data;

                if (socket.currentRoom !== roomId) {
                    socket.emit('error', { message: 'Not connected to this session' });
                    return;
                }

                // Update active session and database
                const activeSession = activeEditorSessions.get(roomId);
                if (activeSession) {
                    activeSession.language = language;
                }

                try {
                    const session = await Session.findOne({ roomId });
                    if (session) {
                        session.language = language;
                        session.lastModified = new Date();
                        session.lastModifiedBy = socket.user._id;
                        await session.save();
                    }
                } catch (dbError) {
                    console.warn('Could not save language to database:', dbError.message);
                }

                // Broadcast language change to all users in room
                io.to(roomId).emit('language-updated', {
                    language,
                    changedBy: {
                        _id: socket.user._id,
                        name: socket.user.name
                    }
                });

            } catch (error) {
                console.error('Error changing language:', error);
                socket.emit('error', { message: 'Failed to change language' });
            }
        });

        // Voice calling events (keeping existing implementation)
        socket.on('start-call', async (data) => {
            try {
                const { roomId } = data;

                if (socket.currentRoom !== roomId) {
                    socket.emit('error', { message: 'Not connected to this session' });
                    return;
                }

                // Check if there's already an active call
                const existingCall = await Call.findOne({ roomId, isActive: true });
                if (existingCall) {
                    socket.emit('error', { message: 'Call already in progress' });
                    return;
                }

                // Create new call
                const call = new Call({
                    roomId,
                    startedBy: socket.user._id,
                    participants: [{
                        userId: socket.user._id,
                        joinedAt: new Date()
                    }]
                });

                await call.save();

                // Notify all users in the room about the call
                io.to(roomId).emit('call-started', {
                    callId: call._id,
                    roomId,
                    startedBy: {
                        _id: socket.user._id,
                        name: socket.user.name
                    },
                    startTime: call.startTime
                });

            } catch (error) {
                console.error('Error starting call:', error);
                socket.emit('error', { message: 'Failed to start call' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.user?.name || 'Unknown'} disconnected from collaborative editor. Reason: ${reason}`);

            // Clear token expiry check
            if (tokenCheckInterval) {
                clearInterval(tokenCheckInterval);
            }

            // Remove from active connections
            if (socket.user && socket.user._id) {
                const userId = socket.user._id.toString();
                if (activeConnections.get(userId) === socket.id) {
                    activeConnections.delete(userId);
                }

                // Remove from session tracking
                if (socket.currentRoom) {
                    const sessionKey = `${userId}-${socket.currentRoom}`;
                    userSessions.delete(sessionKey);
                }
            }

            if (socket.currentRoom) {
                const activeSession = activeEditorSessions.get(socket.currentRoom);
                if (activeSession && socket.user._id) {
                    const userId = socket.user._id.toString();
                    activeSession.connectedUsers.delete(userId);
                    activeSession.cursors.delete(userId);

                    setTimeout(async () => {
                        const onlineUsers = await getOnlineUsersPayload(activeSession);
                        socket.to(socket.currentRoom).emit('user-left', {
                            user: {
                                _id: socket.user._id,
                                name: socket.user.name
                            },
                            connectedUsers: Array.from(activeSession.connectedUsers),
                            onlineUsers
                        });
                    }, 500);

                    // Clean up empty sessions
                    if (activeSession.connectedUsers.size === 0) {
                        setTimeout(() => {
                            if (activeSession.connectedUsers.size === 0) {
                                activeEditorSessions.delete(socket.currentRoom);
                            }
                        }, 300000); // Clean up after 5 minutes of inactivity
                    }
                }
            }

            // Clear save timeout
            if (socket.saveTimeout) {
                clearTimeout(socket.saveTimeout);
            }
        });
    });
};

module.exports = { handleCollaborativeEditor };