import React from 'react';
import './CallNotification.css';

const CallNotification = ({ callerName, onAccept, onDecline }) => {
    return (
        <div className="call-notification">
            <h4>Incoming Call</h4>
            <p><span>{callerName}</span> started a voice call</p>
            <div className="call-notification-buttons">
                <button className="accept-call" onClick={onAccept}>
                    <i className="fas fa-phone"></i> Join Call
                </button>
                <button className="decline-call" onClick={onDecline}>
                    <i className="fas fa-phone-slash"></i> Decline
                </button>
            </div>
        </div>
    );
};

export default CallNotification;