import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import Notification from './Notification';

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

const AIToolbar = ({ mode, role, codeContext, language, setOutput }) => {
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    // Ensure we don't render anything if the user is an interviewee in interview mode
    if (mode === 'interview' && role === 'interviewee') {
        return null;
    }

    const handleAction = async (actionType) => {
        setLoading(true);
        setNotification({ show: true, message: `Running AI ${actionType}...`, type: 'info' });
        try {
            const res = await fetch(`${BACKEND_URL}/api/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    code: codeContext,
                    language: language,
                    context: `Mode: ${mode}, Role: ${role}`
                })
            });
            const data = await res.json();
            if (data.success) {
                // Prepend AI output to the editor's output console
                setOutput(prev => `\n--- AI ${actionType.toUpperCase()} ---\n${data.response}\n` + prev);
                setNotification({ show: true, message: `AI ${actionType} completed! Check Output.`, type: 'success' });
            } else {
                setNotification({ show: true, message: `Error: ${data.message}`, type: 'error' });
            }
        } catch (error) {
            setNotification({ show: true, message: 'Failed to reach AI server.', type: 'error' });
        } finally {
            setLoading(false);
            // Auto hide notification after 3s
            setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
        }
    };

    return (
        <div className="flex items-center space-x-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mr-2">Agent Actions:</span>
            
            {mode === 'interview' && role === 'interviewer' && (
                <>
                    <button 
                        onClick={() => handleAction('review')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50'}`}
                    >
                        🔍 Code Review
                    </button>
                    <button 
                        onClick={() => handleAction('test')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/50'}`}
                    >
                        🧪 Generate Tests
                    </button>
                </>
            )}

            {mode === 'ide' && (
                <>
                    <button 
                        onClick={() => handleAction('architecture')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/50'}`}
                    >
                        📐 Architecture AI
                    </button>
                    <button 
                        onClick={() => handleAction('review')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50'}`}
                    >
                        🔍 Quick Review
                    </button>
                </>
            )}

            {loading && <span className="text-xs text-pink-400 animate-pulse ml-4">Agent is thinking...</span>}

            <Notification
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={3000}
                onClose={() => setNotification({ show: false, message: '', type: 'info' })}
            />
        </div>
    );
};

export default AIToolbar;
