import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authUtils } from '../lib/auth';
import { apiClient } from '../lib/api';

export default function Dashboard() {
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState('interview');
  const [role, setRole] = useState('candidate');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authUtils.getCurrentUser();
    setUser(currentUser);
    // If student, default to candidate
    if (currentUser?.role === 'student') {
        setRole('candidate');
    } else {
        setRole('interviewer');
    }
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}?mode=${mode}&role=${role}`);
    }
  };

  const handleCreateRoom = () => {
    const customRoomId = window.prompt("Enter a name or ID for your new workspace:", "my-new-room");
    if (customRoomId && customRoomId.trim()) {
      navigate(`/room/${customRoomId.trim()}?mode=${mode}&role=${role}`);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      authUtils.clearAuth();
      navigate('/login');
    }
  };

  const isStudent = user?.role === 'student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white font-sans selection:bg-pink-500 selection:text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-5">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              CodeMate AI
            </h1>
            <div className="flex items-center space-x-6">
              <span className="text-gray-300 font-medium text-sm">
                Welcome, <span className="text-white font-bold">{user?.name || 'User'}</span>
                {user?.role && <span className="ml-2 px-2 py-1 text-xs rounded-full bg-white/10">{user.role}</span>}
              </span>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all shadow-lg hover:shadow-pink-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-16 px-6 relative">
        {/* Ambient glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8 sm:p-10">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black mb-3">Join Workspace</h2>
            <p className="text-gray-400 text-lg">Collaborate, interview, and build with Agentic AI.</p>
          </div>
          
          <form onSubmit={handleJoinRoom} className="space-y-8">
            
            {/* Mode Selection */}
            <div>
              <Label className="text-gray-300 text-sm font-bold uppercase tracking-wider mb-4 block">Select Environment Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setMode('interview')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${mode === 'interview' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                >
                  <h3 className="text-xl font-bold mb-1">Interview Mode</h3>
                  <p className="text-sm text-gray-400">Role-based technical interview with AI evaluator tools.</p>
                </div>
                <div 
                  onClick={() => setMode('ide')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${mode === 'ide' ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                >
                  <h3 className="text-xl font-bold mb-1">Collaborative IDE</h3>
                  <p className="text-sm text-gray-400">Pair programming with Terminal and Architecture AI.</p>
                </div>
              </div>
            </div>

            {/* Role Selection (Only for Interview Mode) */}
            {mode === 'interview' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-gray-300 text-sm font-bold uppercase tracking-wider mb-4 block">Select Your Role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => !isStudent && setRole('interviewer')}
                    className={`p-5 rounded-xl border-2 transition-all ${isStudent ? 'opacity-50 cursor-not-allowed border-white/5 bg-black/20' : 'cursor-pointer'} ${role === 'interviewer' && !isStudent ? 'border-emerald-500 bg-emerald-500/10' : (isStudent ? '' : 'border-white/10 bg-black/20 hover:border-white/30')}`}
                  >
                    <h3 className="text-lg font-bold mb-1 flex items-center">
                      Interviewer 
                      {isStudent && <span className="ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Locked</span>}
                    </h3>
                    <p className="text-sm text-gray-400">Full access to AI Code Review and Test generation tools.</p>
                  </div>
                  <div 
                    onClick={() => setRole('candidate')}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${role === 'candidate' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                  >
                    <h3 className="text-lg font-bold mb-1">Candidate</h3>
                    <p className="text-sm text-gray-400">Clean coding environment without AI assistance.</p>
                  </div>
                </div>
                {isStudent && <p className="text-red-400 text-sm mt-3">Students are restricted to the Candidate role.</p>}
              </div>
            )}

            <div className="pt-4">
              <Label htmlFor="roomId" className="text-gray-300 text-sm font-bold uppercase tracking-wider mb-2 block">Room ID</Label>
              <Input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter existing room ID..."
                className="w-full bg-black/40 border-white/20 text-white placeholder:text-gray-600 focus:border-pink-500 focus:ring-pink-500 h-14 text-lg rounded-xl"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-bold text-lg shadow-lg hover:shadow-pink-500/25 transition-all transform hover:-translate-y-1"
            >
              Join Workspace
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center space-x-4">
            <div className="h-px bg-white/10 flex-grow"></div>
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">OR</span>
            <div className="h-px bg-white/10 flex-grow"></div>
          </div>

          <div className="mt-8">
            <button 
              onClick={handleCreateRoom} 
              className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg transition-all"
            >
              ✨ Create New Workspace
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}