import React from 'react';
import './Footer.css';

const Footer = ({ connectionStatus, participantCount, lastModified, onlineUsers = [] }) => {
    const names = onlineUsers.map((u) => u.name).filter(Boolean).join(', ');

    return (
        <div className="footer">
            <div className="connection-status">
                <span>{connectionStatus}</span>
                <span>•</span>
                <span>{participantCount} online</span>
                {names && <span className="footer-online-names"> ({names})</span>}
            </div>
            <div>{lastModified}</div>
        </div>
    );
};

export default Footer;
