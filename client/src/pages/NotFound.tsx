import { useNavigate } from 'react-router-dom';
import { Ghost } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
        <Ghost size={120} className="relative text-primary animate-bounce mix-blend-screen" />
      </div>
      <div>
        <h1 className="text-6xl font-black mb-2 tracking-tighter">404</h1>
        <p className="text-xl text-base-content/60 font-medium">Coordinate mapping failed. Space is empty.</p>
      </div>
      <button className="btn btn-primary btn-wide shadow-xl shadow-primary/20" onClick={() => navigate('/')}>
        Return to Dashboard Grid
      </button>
    </div>
  );
};
