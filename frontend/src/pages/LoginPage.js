import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

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
      
      // Redirect based on role
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
    <div className="min-h-screen bg-slate-50 flex" data-testid="login-page">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img src="/logo-auth.png" alt="SportLyo" className="h-12 mx-auto" data-testid="login-logo" />
            </Link>
            <h1 className="font-heading text-3xl font-bold uppercase">Connexion</h1>
            <p className="text-slate-500 mt-2">Accédez à votre espace personnel</p>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={loading}
              data-testid="submit-login-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1753516264455-f7678cb97b7a?w=1920"
          alt="Sports"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-asphalt/60" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h2 className="font-heading text-4xl font-bold uppercase mb-4">
              Rejoignez la communauté
            </h2>
            <p className="text-slate-300 text-lg max-w-md">
              Des milliers d'athlètes utilisent SportLyo pour trouver leur prochain défi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
