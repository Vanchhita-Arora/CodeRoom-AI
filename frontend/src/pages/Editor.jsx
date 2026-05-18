import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Phone, PhoneOff, Settings, LogOut, Copy } from 'lucide-react';
import { getCurrentUser, logout, isAuthenticated } from '@/lib/auth';
import { useSocket } from '@/hooks/useSocket';
import CodeEditor from '@/components/CodeEditor';
import ParticipantsList from '@/components/ParticipantsList';

export default function Editor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // State management
  const [roomId, setRoomId] = useState(searchParams.get('room') || '');
  const [isInRoom, setIsInRoom] = useState(false);
  const [code, setCode] = useState('// Welcome to the collaborative editor!\n// Start typing to see real-time collaboration\n\nconsole.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isInCall, setIsInCall] = useState(false);

  // Socket connection
  const {
    socket,
    isConnected,
    connectionStatus,
    emitCodeChange,
    emitLanguageChange,
    emitCursorUpdate,
  } = useSocket({
    roomId: isInRoom ? roomId : undefined,
    onCodeUpdate: (newCode, author) => {
      setCode(newCode);
    },
    onUserJoined: (user) => {
      console.log('User joined:', user.name);
    },
    onUserLeft: (user) => {
      console.log('User left:', user.name);
    },
    onParticipantsUpdate: (newParticipants) => {
      setParticipants(newParticipants);
    },
    onLanguageUpdate: (newLanguage) => {
      setLanguage(newLanguage);
    },
    onCursorUpdate: (userId, userName, position) => {
      // Handle cursor updates if needed
      console.log('Cursor update:', userName, position);
    },
  });

  // Join room function
  const handleJoinRoom = () => {
    if (!roomId.trim()) return;
    
    setIsInRoom(true);
    setSearchParams({ room: roomId });
  };

  // Leave room function
  const handleLeaveRoom = () => {
    setIsInRoom(false);
    setSearchParams({});
    setParticipants([]);
  };

  // Code change handler
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (isInRoom) {
      emitCodeChange(newCode, language);
    }
  }, [isInRoom, language, emitCodeChange]);

  // Language change handler
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (isInRoom) {
      emitLanguageChange(newLanguage);
    }
  };

  // Cursor activity handler
  const handleCursorActivity = useCallback((cursor) => {
    if (isInRoom) {
      emitCursorUpdate(cursor);
    }
  }, [isInRoom, emitCursorUpdate]);

  // Run code function
  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running...');

    try {
      const response = await fetch('/api/editor/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: language,
          stdin: ''
        }),
        credentials: 'include'
      });

      const result = await response.json();
      
      const outputText = 
        (result.stdout || '') +
        (result.stderr ? '\nError: ' + result.stderr : '') +
        (result.compile_output ? '\nCompiler: ' + result.compile_output : '') ||
        result.status ||
        'No output';
      
      setOutput(outputText);
    } catch (error) {
      setOutput('Error: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Copy room link
  const handleCopyRoomLink = () => {
    const url = `${window.location.origin}/editor?room=${roomId}`;
    navigator.clipboard.writeText(url);
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Collaborative Editor</h1>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {connectionStatus}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {isInRoom && (
              <>
                <ParticipantsList 
                  participants={participants} 
                  currentUserId={currentUser.id} 
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRoomLink}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>Welcome, {currentUser.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Room Controls */}
        {!isInRoom ? (
          <div className="mt-4 flex items-center gap-4">
            <Input
              placeholder="Enter room ID to join or create"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="max-w-xs bg-gray-700 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
            <Button onClick={handleJoinRoom} disabled={!roomId.trim()}>
              Join Room
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">Room: <strong>{roomId}</strong></span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveRoom}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Leave Room
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleRunCode}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 p-6">
          <div className="h-full">
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              onCursorActivity={handleCursorActivity}
              language={language}
              readOnly={!isInRoom}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-96 border-l border-gray-700 p-6">
          <Card className="h-full bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded border border-gray-600 h-full overflow-auto">
                {output || 'Run your code to see output here...'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}