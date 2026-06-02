import React, { useState, useRef, useEffect } from 'react';

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

const AgentChat = ({ mode, role, codeContext, language, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        
        // Save current history before adding the new message for the API call
        const historyContext = messages.slice(-10);
        
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    code: userMsg,
                    language: language,
                    context: `Mode: ${mode}, Role: ${role}, Code:\n${codeContext}`,
                    conversationHistory: historyContext,
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
                setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: 'Error: ' + data.message }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Failed to reach AI server.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="agent-chat" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', borderLeft: '1px solid #333' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #333', background: '#111', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></div>
                <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    Agentic AI Chat
                </h3>
            </div>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {messages.length === 0 && (
                    <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '30px' }}>✨</span>
                        <span>Ask me anything about your code!</span>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ 
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#1f2937',
                        color: msg.role === 'user' ? '#fff' : '#e5e7eb',
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                        maxWidth: '85%',
                        whiteSpace: 'pre-wrap',
                        fontFamily: msg.role === 'ai' ? 'monospace' : 'inherit',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        border: msg.role === 'ai' ? '1px solid #374151' : 'none',
                        lineHeight: '1.5'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: '#1f2937', padding: '12px 16px', borderRadius: '16px 16px 16px 0', border: '1px solid #374151' }}>
                        <span style={{ color: '#a855f7', fontStyle: 'italic', fontSize: '13px' }}>Thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} style={{ display: 'flex', padding: '15px', borderTop: '1px solid #333', background: '#111' }}>
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    style={{ flexGrow: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                    onBlur={(e) => e.target.style.borderColor = '#374151'}
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()} 
                    style={{ 
                        marginLeft: '10px',
                        padding: '10px 20px',
                        background: input.trim() && !loading ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#374151',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        transition: 'opacity 0.2s',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default AgentChat;
