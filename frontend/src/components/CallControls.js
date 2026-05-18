import React from 'react';
import './AudioControls.css';

const AudioControls = ({ onEndCall }) => {
    return (
        <div className="audio-controls">
            <h4>Voice Call Active</h4>
            <div className="audio-buttons">
                <button className="audio-btn end-call-btn" onClick={onEndCall}>
                    <i className="fas fa-phone-slash"></i>
                </button>
            </div>
        </div>
    );
};

export default AudioControls;