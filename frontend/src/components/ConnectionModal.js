import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authUtils } from '../lib/auth';
import './ConnectionModal.css';

const ConnectionModal = ({ onConnect, initialRoomId, isConnecting }) => {
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const navigate = useNavigate();
    const user = authUtils.getCurrentUser();
    const isAuthenticated = authUtils.isAuthenticated();

    useEffect(() => {
        if (initialRoomId) {
            setRoomId(initialRoomId);
        } else {
            const urlRoom = new URLSearchParams(window.location.search).get('room');
            if (urlRoom) setRoomId(urlRoom);
        }
    }, [initialRoomId]);

    const handleConnect = () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        onConnect(roomId.trim());
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleConnect();
        }
    };

    return (
        <div className="modal" role="dialog" aria-labelledby="join-session-title">
            <div className="modal-content">
                <h2 id="join-session-title" className="modal-title">Join Collaborative Session</h2>

                <p className="modal-welcome">Welcome to Collaborator</p>

                {user && (
                    <div className="user-preview">
                        <h4>Signed in as</h4>
                        <p><strong>Name:</strong> {user.name || '—'}</p>
                        <p><strong>Email:</strong> {user.email || '—'}</p>
                        <p><strong>Role:</strong> {user.role || 'user'}</p>
                    </div>
                )}

                {!isAuthenticated && (
                    <p className="auth-hint">
                        Please sign in to join a session.
                    </p>
                )}

                <div className="form-group">
                    <label htmlFor="roomId">Room ID</label>
                    <input
                        type="text"
                        id="roomId"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Enter room ID to join or create"
                        readOnly={Boolean(initialRoomId)}
                        autoComplete="off"
                    />
                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConnect}
                    disabled={isConnecting || !roomId.trim()}
                >
                    {isConnecting ? 'Connecting…' : isAuthenticated ? 'Join Session' : 'Sign in to Join'}
                </button>
            </div>
        </div>
    );
};

export default ConnectionModal;
