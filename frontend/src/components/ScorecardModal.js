import React from 'react';
import './ScorecardModal.css';

const ScorecardModal = ({ htmlContent, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="scorecard-overlay">
            <div className="scorecard-modal">
                <div className="scorecard-header">
                    <h2>Interview Scorecard</h2>
                    <div className="scorecard-actions">
                        <button className="btn-print" onClick={handlePrint}>
                            <i className="fas fa-file-pdf"></i> Download PDF
                        </button>
                        <button className="btn-close" onClick={onClose}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div 
                    className="scorecard-content" 
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
            </div>
        </div>
    );
};

export default ScorecardModal;
