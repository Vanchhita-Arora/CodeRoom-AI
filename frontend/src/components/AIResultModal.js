import React from 'react';
import './AIResultModal.css';

const AIResultModal = ({ title, content, agentType, onClose }) => {
    // Simple markdown renderer for basic formatting (code blocks, bold, lists)
    const renderContent = (text) => {
        if (!text) return null;
        
        // Very basic custom markdown parser
        const parts = text.split(/(```[\s\S]*?```)/g);
        
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                // Code block
                const codeMatch = part.match(/```(\w+)?\n([\s\S]*?)```/);
                const code = codeMatch ? codeMatch[2] : part.replace(/```/g, '');
                return (
                    <div key={index} className="ai-code-block">
                        <pre><code>{code}</code></pre>
                    </div>
                );
            } else {
                // Text block - process bold and line breaks
                const formattedText = part
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .split('\n')
                    .map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>);
                return <p key={index} className="ai-text-block">{formattedText}</p>;
            }
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        // Could add a toast here, but simple is fine for now
    };

    // Get color based on agent type
    const getAgentColor = () => {
        switch (agentType) {
            case 'review': return 'from-emerald-600 to-teal-800';
            case 'test': return 'from-blue-600 to-indigo-800';
            case 'followup': return 'from-amber-500 to-orange-700';
            case 'architecture': return 'from-purple-600 to-violet-900';
            default: return 'from-indigo-600 to-purple-800';
        }
    };

    return (
        <div className="ai-modal-overlay" onClick={onClose}>
            <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className={`ai-modal-header bg-gradient-to-r ${getAgentColor()}`}>
                    <div className="ai-modal-title">
                        <span>✨</span>
                        <h2>{title}</h2>
                    </div>
                    <div className="ai-modal-actions">
                        <button className="ai-btn-copy" onClick={handleCopy} title="Copy to clipboard">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button className="ai-btn-close" onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className="ai-modal-body">
                    {renderContent(content)}
                </div>
            </div>
        </div>
    );
};

export default AIResultModal;
