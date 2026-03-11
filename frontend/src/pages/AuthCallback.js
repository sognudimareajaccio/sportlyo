import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithOAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL hash
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error('No session_id found in URL');
          navigate('/login');
          return;
        }

        const sessionId = sessionIdMatch[1];

        // Exchange session_id for user data and token
        const response = await authApi.processSession(sessionId);
        const { user, token } = response.data;

        // Update auth context
        loginWithOAuth(user, token);

        // Clear the hash and redirect
        window.history.replaceState(null, '', window.location.pathname);
        
        // Navigate to dashboard with user data to avoid race condition
        navigate('/dashboard', { state: { user }, replace: true });
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate, loginWithOAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
