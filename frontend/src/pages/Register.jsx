import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { apiClient } from '../lib/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClient.register(formData);
      // Navigate to dashboard after successful registration
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle="Join the collaborative workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/25 text-red-400 rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300 text-sm font-semibold">Full Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className="w-full bg-black/40 border-white/10 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300 text-sm font-semibold">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            className="w-full bg-black/40 border-white/10 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300 text-sm font-semibold">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className="w-full bg-black/40 border-white/10 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500 h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-gray-300 text-sm font-semibold">Role</Label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-0"
          >
            <option value="student" style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>Student</option>
            <option value="ta" style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>Teaching Assistant</option>
          </select>
        </div>

        <Button
          type="submit"
          className="w-full py-6 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-bold text-base shadow-lg hover:shadow-pink-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-pink-500 hover:text-pink-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}