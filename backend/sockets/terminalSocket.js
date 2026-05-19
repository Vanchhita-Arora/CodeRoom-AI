const os = require('os');
const { spawn } = require('child_process');
const { getWorkspaceForRoom } = require('../utils/fileSystemManager');

const activeTerminals = new Map();

const handleTerminalSocket = (io) => {
    const terminalNamespace = io.of('/terminal');

    terminalNamespace.on('connection', (socket) => {
        console.log(`Terminal connected: ${socket.id}`);

        socket.on('create-terminal', ({ roomId }) => {
            // Allow multiple users in the same room to share the terminal output?
            // For now, one terminal per room.
            socket.join(roomId);

            if (!activeTerminals.has(roomId)) {
                const workspacePath = getWorkspaceForRoom(roomId);
                const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh';
                const ptyProcess = spawn(shell, [], {
                    cwd: workspacePath,
                    env: process.env,
                    shell: true
                });

                ptyProcess.stdout.on('data', (data) => {
                    terminalNamespace.to(roomId).emit('terminal-data', data.toString());
                });
                
                ptyProcess.stderr.on('data', (data) => {
                    terminalNamespace.to(roomId).emit('terminal-data', data.toString());
                });

                // Add write method for compatibility with socket.on('terminal-input')
                ptyProcess.write = (data) => {
                    if (ptyProcess.stdin.writable) {
                        ptyProcess.stdin.write(data);
                    }
                };

                activeTerminals.set(roomId, ptyProcess);
            }

            // Send an initial message
            socket.emit('terminal-data', `\r\n\x1b[32m--- Connected to Room ${roomId} Terminal ---\x1b[0m\r\n`);
        });

        socket.on('terminal-input', ({ roomId, data }) => {
            const ptyProcess = activeTerminals.get(roomId);
            if (ptyProcess) {
                ptyProcess.write(data);
            }
        });

        socket.on('resize-terminal', ({ roomId, cols, rows }) => {
            const ptyProcess = activeTerminals.get(roomId);
            if (ptyProcess) {
                // Resize not fully supported in simple child_process, ignore
            }
        });

        socket.on('disconnect', () => {
            console.log(`Terminal disconnected: ${socket.id}`);
            // Logic to clean up terminals if room is empty could go here
        });
    });
};

module.exports = {
    handleTerminalSocket
};
