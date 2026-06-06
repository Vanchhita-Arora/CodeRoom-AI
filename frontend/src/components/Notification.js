import React, { useEffect, useState } from 'react';
import './Notification.css';

const Notification = ({ show, message, type, duration = 3500, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!show || !message) {
            setVisible(false);
            return;
        }

        setVisible(true);
        const hideTimer = setTimeout(() => {
            setVisible(false);
        }, duration);

        const closeTimer = setTimeout(() => {
            onClose?.();
        }, duration + 300);

        return () => {
            clearTimeout(hideTimer);
            clearTimeout(closeTimer);
        };
    }, [show, message, type, duration, onClose]);

    if (!show || !message) return null;

    return (
        <div
            className={`notification ${type || 'info'} ${visible ? 'notification-visible' : 'notification-hiding'}`}
            role="status"
            aria-live="polite"
        >
            {message}
        </div>
    );
};

export default Notification;
