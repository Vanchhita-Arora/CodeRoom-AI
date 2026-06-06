const express = require('express');
const {
    updateSessionCode,
    getSessionCode,
    updateCursorPosition,
    getActiveSessions
} = require('../controllers/collaborativeEditorController');
const { userAuth } = require('../middleware/auth');

const router = express.Router();

// Get session code and editor state (requires auth)
router.get('/:roomId', userAuth, getSessionCode);

// Update session code (requires auth)
router.put('/:roomId/code', userAuth, updateSessionCode);

// Update cursor position (requires auth)
router.put('/:roomId/cursor', userAuth, updateCursorPosition);

// Get active sessions overview (requires auth)
router.get('/active/sessions', userAuth, getActiveSessions);

module.exports = router;