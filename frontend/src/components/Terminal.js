import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Terminal = ({ roomId }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!roomId || !terminalRef.current) return;

        // Initialize xterm
        const xterm = new XTerm({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#f3f3f3',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);
        
        // Only open xterm when the container has dimensions
        const observer = new ResizeObserver((entries) => {
            if (entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
                if (!xtermRef.current) {
                    xterm.open(terminalRef.current);
                    xtermRef.current = xterm;
                    fitAddonRef.current = fitAddon;
                    
                    setTimeout(() => {
                        try {
                            fitAddon.fit();
                        } catch (e) {
                            console.warn("xterm fit failed:", e);
                        }
                    }, 50);
                }
            }
        });

        observer.observe(terminalRef.current);

        // Connect to Socket
        const socket = io(`${BACKEND_URL}/terminal`, {
            transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('create-terminal', { roomId });
            
            // Resize event
            setTimeout(() => {
                if (xtermRef.current && xtermRef.current.cols) {
                    socket.emit('resize-terminal', {
                        roomId,
                        cols: xtermRef.current.cols,
                        rows: xtermRef.current.rows
                    });
                }
            }, 100);
        });

        socket.on('terminal-data', (data) => {
            xterm.write(data);
        });

        socket.on('disconnect', () => {
            setConnected(false);
            xterm.write('\r\n\x1b[31mTerminal Disconnected\x1b[0m\r\n');
        });

        // Write from xterm to socket
        xterm.onData((data) => {
            if (socketRef.current?.connected) {
                socketRef.current.emit('terminal-input', { roomId, data });
            }
        });

        const handleResize = () => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn("xterm fit failed on resize:", e);
            }
            if (socket.connected && xterm.cols && xterm.rows) {
                socket.emit('resize-terminal', {
                    roomId,
                    cols: xterm.cols,
                    rows: xterm.rows
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
            socket.disconnect();
            if (xtermRef.current) {
                xtermRef.current.dispose();
            }
        };
    }, [roomId]);

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#333', color: '#fff', padding: '4px 10px', fontSize: '12px' }}>
                Terminal {connected ? '(Connected)' : '(Disconnected)'}
            </div>
            <div ref={terminalRef} style={{ flexGrow: 1, overflow: 'hidden' }} />
        </div>
    );
};

export default Terminal;
