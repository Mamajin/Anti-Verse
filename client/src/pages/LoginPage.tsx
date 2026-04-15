import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  
  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login({ email, password });
        navigate('/');
      } else {
        await register({ email, password, displayName: displayName || 'Researcher', role: 'researcher' });
        // After register, jump straight into login
        await login({ email, password });
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral to-base-300 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="z-10 w-full max-w-md p-8 m-4 rounded-3xl shadow-2xl backdrop-blur-xl bg-base-100/30 border border-base-100/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-2 tracking-tight">
            Anti-Verse
          </h1>
          <p className="text-base-content/80 text-sm">Synchronize your terrarium arrays.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert alert-error shadow-lg">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content/90 font-medium">Display Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Dr. Operator" 
                className="input input-bordered focus:input-primary bg-base-100/50 backdrop-blur-sm w-full transition-all duration-300" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content/90 font-medium">Email / Matrix ID</span>
            </label>
            <input 
              type="email" 
              placeholder="operator@anti-verse.io" 
              className="input input-bordered focus:input-primary bg-base-100/50 backdrop-blur-sm w-full transition-all duration-300" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content/90 font-medium">Access Code</span>
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input input-bordered focus:input-primary bg-base-100/50 backdrop-blur-sm w-full transition-all duration-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary w-full text-lg shadow-lg shadow-primary/30 transition-transform active:scale-95 ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLogin ? 'Initialize Uplink' : 'Format Identity'}
          </button>
        </form>

        <div className="divider text-base-content/50">OR</div>

        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="btn btn-ghost w-full text-base-content/70 hover:text-base-content"
          type="button"
        >
          {isLogin ? 'Establish new identity protocol' : 'Return to login phase'}
        </button>
      </div>
    </div>
  );
};
