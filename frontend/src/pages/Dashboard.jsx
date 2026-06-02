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
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-fuchsia-400 text-white font-sans selection:bg-pink-300 selection:text-white">
      <header className="border-b border-white/15 bg-[#1e1b3a]/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-5">
            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-100 to-indigo-100 drop-shadow-sm">
              CodeMate AI
            </h1>
            <div className="flex items-center space-x-6">
              <span className="text-white/80 font-medium text-sm flex items-center">
                Welcome, <span className="text-white font-bold ml-1">{user?.name || 'User'}</span>
                {user?.role && <span className="ml-3 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-white/40 bg-white/20 text-white shadow-sm">{user.role}</span>}
              </span>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-white transition-all shadow-sm hover:shadow-pink-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-16 px-6 relative">


        <div className="relative bg-[#1e1b3a]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black mb-3 text-white drop-shadow-md">Join Workspace</h2>
            <p className="text-indigo-100/90 text-lg drop-shadow-sm font-medium">Collaborate, interview, and build with Agentic AI.</p>
          </div>
          
          <form onSubmit={handleJoinRoom} className="space-y-8">
            
            {/* Mode Selection */}
            <div>
              <Label className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4 block drop-shadow-sm">Select Environment Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setMode('interview')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 ${mode === 'interview' ? 'border-pink-300 bg-pink-500/25 shadow-[0_0_20px_rgba(244,114,182,0.35)]' : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'}`}
                >
                  <h3 className="text-xl font-bold mb-1 text-white">Interview Mode</h3>
                  <p className="text-sm text-indigo-100/80">Role-based technical interview with AI evaluator tools.</p>
                </div>
                <div 
                  onClick={() => setMode('ide')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 ${mode === 'ide' ? 'border-indigo-300 bg-indigo-500/25 shadow-[0_0_20px_rgba(129,140,248,0.35)]' : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'}`}
                >
                  <h3 className="text-xl font-bold mb-1 text-white">Collaborative IDE</h3>
                  <p className="text-sm text-indigo-100/80">Pair programming with Terminal and Architecture AI.</p>
                </div>
              </div>
            </div>

            {/* Role Selection (Only for Interview Mode) */}
            {mode === 'interview' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4 block drop-shadow-sm">Select Your Role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => !isStudent && setRole('interviewer')}
                    className={`p-5 rounded-xl border-2 transition-all duration-200 ${isStudent ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/5' : 'cursor-pointer'} ${role === 'interviewer' && !isStudent ? 'border-emerald-300 bg-emerald-500/25 shadow-[0_0_20px_rgba(52,211,153,0.35)]' : (isStudent ? '' : 'border-white/10 bg-white/5 hover:border-emerald-300/50 hover:bg-white/10')}`}
                  >
                    <h3 className="text-lg font-bold mb-1 flex items-center text-white">
                      Interviewer 
                      {isStudent && <span className="ml-2 text-xs bg-red-500/30 text-red-100 px-2 py-0.5 rounded border border-red-400/30">Locked</span>}
                    </h3>
                    <p className="text-sm text-indigo-100/80">Full access to AI Code Review and Test generation tools.</p>
                  </div>
                  <div 
                    onClick={() => setRole('candidate')}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 ${role === 'candidate' ? 'border-blue-300 bg-blue-500/25 shadow-[0_0_20px_rgba(96,165,250,0.35)]' : 'border-white/10 bg-white/5 hover:border-blue-300/50 hover:bg-white/10'}`}
                  >
                    <h3 className="text-lg font-bold mb-1 text-white">Candidate</h3>
                    <p className="text-sm text-indigo-100/80">Clean coding environment without AI assistance.</p>
                  </div>
                </div>
                {isStudent && <p className="text-pink-200/90 text-sm mt-3 font-medium drop-shadow-sm">Students are restricted to the Candidate role.</p>}
              </div>
            )}

            <div className="pt-4">
              <Label htmlFor="roomId" className="text-white/90 text-xs font-bold uppercase tracking-widest mb-2 block drop-shadow-sm">Room ID</Label>
              <Input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter existing room ID..."
                className="w-full bg-white/5 border-white/20 text-white placeholder:text-indigo-200/50 focus:border-pink-300 focus:ring-pink-300 h-14 text-lg rounded-xl shadow-inner transition-all"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-400 to-fuchsia-400 hover:from-indigo-300 hover:to-fuchsia-300 text-white font-bold text-lg shadow-lg hover:shadow-indigo-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Join Workspace
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center space-x-4">
            <div className="h-px bg-white/15 flex-grow"></div>
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">OR</span>
            <div className="h-px bg-white/15 flex-grow"></div>
          </div>

          <div className="mt-8">
            <button 
              onClick={handleCreateRoom} 
              className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-lg transition-all shadow-lg hover:shadow-pink-500/10 active:scale-[0.99]"
            >
              ✨ Create New Workspace
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}