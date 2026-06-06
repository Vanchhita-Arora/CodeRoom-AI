const fs = require('fs');
const path = require('path');
const os = require('os');

const WORKSPACE_BASE = path.join(__dirname, '..', 'temp_workspaces');

// Ensure base workspace directory exists
if (!fs.existsSync(WORKSPACE_BASE)) {
    fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
}

const getWorkspaceForRoom = (roomId) => {
    const roomPath = path.join(WORKSPACE_BASE, roomId);
    if (!fs.existsSync(roomPath)) {
        fs.mkdirSync(roomPath, { recursive: true });
        // Create an initial file
        fs.writeFileSync(path.join(roomPath, 'index.js'), '// Welcome to your new project\nconsole.log("Hello IDE!");');
    }
    return roomPath;
};

module.exports = {
    getWorkspaceForRoom,
    WORKSPACE_BASE
};
