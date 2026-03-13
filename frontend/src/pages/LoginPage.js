import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import AnimatedBackground from '../components/AnimatedBackground';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(formData.email, formData.password);
      toast.success('Connexion réussie !');
      
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'organizer') {
        navigate('/organizer');
      } else {
        navigate(from);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground>
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="login-page">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Glassmorphism Card */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-8 md:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-block mb-6">
                <img src="/logo-light.png" alt="SportLyo" className="h-10 mx-auto" data-testid="login-logo" />
              </Link>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">Connexion</h1>
              <p className="text-slate-400 mt-2 text-sm">Accédez à votre espace personnel</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-xs font-heading uppercase tracking-widest text-slate-400">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 text-white placeholder:text-slate-600 outline-none text-sm focus:border-[#ff4500]/40 transition-colors"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-heading uppercase tracking-widest text-slate-400">Mot de passe</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full h-12 pl-10 pr-10 bg-white/[0.05] border border-white/10 text-white placeholder:text-slate-600 outline-none text-sm focus:border-[#ff4500]/40 transition-colors"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#ff4500] hover:bg-[#e03e00] text-white font-heading font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                data-testid="submit-login-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-[#ff4500] font-semibold hover:text-[#ff6a33] transition-colors">
                S'inscrire
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
};

export default LoginPage;
