import React, { useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import Notification from './Notification';

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

const AIToolbar = ({ mode, role, codeContext, language, currentUser, onShowAIResult, onShowScorecard }) => {
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const cacheRef = useRef({});

    // Ensure we don't render anything if the user is a candidate or interviewee in interview mode
    if (mode === 'interview' && (role === 'interviewee' || role === 'candidate')) {
        return null;
    }

    // Simple string hash for stable cache keys (avoids issues with long code strings)
    const hashCode = (str) => {
        let hash = 0;
        const s = (str || '').trim();
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `${s.length}_${hash}`;
    };

    const handleAction = async (actionType) => {
        const codeHash = hashCode(codeContext);
        const cacheKey = `${actionType}::${language}::${codeHash}`;
        
        // Check cache — if same action on same code (by hash + length), return cached result
        if (cacheRef.current[actionType] && cacheRef.current[actionType].key === cacheKey) {
            console.log(`[AIToolbar] Cache HIT for "${actionType}" (key: ${cacheKey})`);
            const cachedData = cacheRef.current[actionType].data;
            if (actionType === 'scorecard' && onShowScorecard) {
                onShowScorecard(cachedData);
                setNotification({ show: true, message: `Showing cached Scorecard`, type: 'success' });
            } else if (onShowAIResult) {
                onShowAIResult({
                    title: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Result (Cached)`,
                    content: cachedData,
                    agentType: actionType
                });
                setNotification({ show: true, message: `Showing cached ${actionType} result`, type: 'success' });
            }
            setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
            return;
        }
        console.log(`[AIToolbar] Cache MISS for "${actionType}" (key: ${cacheKey})`);

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
                    context: `Mode: ${mode}, Role: ${role}`,
                    userProfile: currentUser ? {
                        name: currentUser.name,
                        skills: currentUser.skills,
                        programmingLanguages: currentUser.programmingLanguages,
                        university: currentUser.university,
                        yearOfStudy: currentUser.yearOfStudy
                    } : null
                })
            });
            const data = await res.json();
            if (data.success) {
                // Save to cache
                cacheRef.current[actionType] = { key: cacheKey, data: data.response };

                if (actionType === 'scorecard' && onShowScorecard) {
                    onShowScorecard(data.response);
                    setNotification({ show: true, message: `Scorecard generated!`, type: 'success' });
                } else if (onShowAIResult) {
                    onShowAIResult({
                        title: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Result`,
                        content: data.response,
                        agentType: actionType
                    });
                    setNotification({ show: true, message: `AI ${actionType} completed!`, type: 'success' });
                }
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
                    <button 
                        onClick={() => handleAction('followup')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50'}`}
                    >
                        🤔 Draft Follow-ups
                    </button>
                    <button 
                        onClick={() => handleAction('scorecard')} 
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50'}`}
                    >
                        📊 Generate Scorecard
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
