import React, { useState } from 'react';
import './Header.css';

const Header = ({
    connectionStatus,
    isConnected,
    currentRoomId,
    language,
    onLanguageChange,
    onlineUsers,
    currentUserId,
    getAvatarColor,
    isInCall,
    onCallAction,
    callDuration,
    callParticipants,
    onRunCode,
    onReconnect,
    isConnecting,
    isRunning
}) => {
    const [showParticipantsPanel, setShowParticipantsPanel] = useState(true);
    const normalizedCurrentId = currentUserId?.toString?.() || '';

    return (
        <div className="header">
            <div className="header-top">
                <div className="session-info">
                    <div
                        className={`status-indicator ${isConnected ? '' : 'disconnected'}`}
                        title={connectionStatus}
                    />
                    <div className="session-title">
                        {currentRoomId ? `Room: ${currentRoomId}` : 'Collaborative Code Editor'}
                    </div>
                </div>

                <div className="run-container">
                    <button
                        type="button"
                        className="run-btn"
                        onClick={onRunCode}
                        disabled={isRunning}
                    >
                        {isRunning ? 'Running…' : 'Run'}
                    </button>
                    <div className="call-controls">
                        <button
                            type="button"
                            className={`call-btn ${isInCall ? 'in-call' : ''}`}
                            onClick={onCallAction}
                            disabled={!isConnected}
                        >
                            {isInCall ? 'Leave Call' : 'Start Call'}
                        </button>
                        {isInCall && (
                            <div className="call-status">
                                <span className="call-timer">{callDuration}</span>
                                <span className="call-participants">• {callParticipants} in call</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="controls">
                    <select
                        className="language-selector"
                        value={language}
                        onChange={(e) => onLanguageChange(e.target.value)}
                        disabled={!isConnected}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    {!isConnected && onReconnect && (
                        <button
                            type="button"
                            className="reconnect-btn"
                            onClick={onReconnect}
                            disabled={isConnecting}
                        >
                            {isConnecting ? 'Connecting…' : 'Reconnect'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="online-toggle"
                        onClick={() => setShowParticipantsPanel((v) => !v)}
                    >
                        Online ({onlineUsers.length})
                    </button>
                </div>
            </div>

            {showParticipantsPanel && (
                <div className="online-users-bar">
                    <div className="online-users-header">
                        <span className="online-label">
                            <span className="online-dot" />
                            {onlineUsers.length} online in session
                        </span>
                    </div>
                    <div className="online-users-list">
                        {onlineUsers.length === 0 ? (
                            <span className="online-empty">No one is online yet</span>
                        ) : (
                            onlineUsers.map((user) => {
                                const id = user._id?.toString?.() || String(user._id);
                                const isYou = id === normalizedCurrentId;
                                return (
                                    <div
                                        key={id}
                                        className={`online-user-chip ${isYou ? 'is-you' : ''}`}
                                        title={user.email || user.name}
                                    >
                                        <div
                                            className="participant-avatar"
                                            style={{ backgroundColor: getAvatarColor(user.name || 'User') }}
                                        >
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="online-user-name">
                                            {user.name || 'User'}
                                            {isYou && ' (you)'}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;
