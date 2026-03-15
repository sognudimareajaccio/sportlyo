import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Phone, Loader2, Building2, Handshake } from 'lucide-react';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import AnimatedBackground from '../components/AnimatedBackground';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'participant';
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: ['participant', 'organizer', 'provider'].includes(defaultRole) ? defaultRole : 'participant',
    company_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.role === 'provider' && !formData.company_name) {
      toast.error('Le nom de votre entreprise est requis');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData.name, formData.email, formData.password, formData.phone, formData.role, formData.company_name);
      if (result?.pending) {
        toast.success('Inscription enregistrée ! Votre compte est en attente de validation par l\'administrateur.');
        navigate('/login');
      } else {
        toast.success('Compte créé avec succès !');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 text-white placeholder:text-slate-600 outline-none text-sm focus:border-[#ff4500]/40 transition-colors";

  const roles = [
    { id: 'participant', label: 'Participant', desc: 'Inscrivez-vous aux courses', icon: User },
    { id: 'organizer', label: 'Organisateur', desc: 'Créez vos événements', icon: Building2 },
    { id: 'provider', label: 'Partenaire', desc: 'Proposez vos services', icon: Handshake }
  ];

  return (
    <AnimatedBackground>
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="register-page">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-8 md:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-block mb-6">
                <img src="/logo-light.png" alt="SportLyo" className="h-10 mx-auto" data-testid="register-logo" />
              </Link>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">Créer un compte</h1>
              <p className="text-slate-400 mt-2 text-sm">Rejoignez la communauté SportLyo</p>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2 mb-6" data-testid="role-selector">
              {roles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                  className={`p-2.5 border text-center transition-all ${
                    formData.role === r.id
                      ? 'border-[#ff4500] bg-[#ff4500]/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  data-testid={`role-${r.id}`}
                >
                  <r.icon className={`w-4 h-4 mx-auto mb-1 ${formData.role === r.id ? 'text-[#ff4500]' : 'text-slate-400'}`} />
                  <p className={`text-[10px] font-heading font-bold uppercase ${formData.role === r.id ? 'text-[#ff4500]' : 'text-slate-400'}`}>{r.label}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-heading uppercase tracking-widest text-slate-400">
                  {formData.role === 'provider' ? 'Nom du responsable *' : 'Nom complet *'}
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="name" type="text" placeholder="Jean Dupont" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className={inputClass} data-testid="name-input" />
                </div>
              </div>

              {formData.role === 'provider' && (
                <div>
                  <Label htmlFor="company" className="text-xs font-heading uppercase tracking-widest text-slate-400">Nom de l'entreprise *</Label>
                  <div className="relative mt-1.5">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input id="company" type="text" placeholder="SportWear Lyon" value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} className={inputClass} data-testid="company-input" />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-xs font-heading uppercase tracking-widest text-slate-400">Email *</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="email" type="email" placeholder="votre@email.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className={inputClass} data-testid="email-input" />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-heading uppercase tracking-widest text-slate-400">Téléphone</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="phone" type="tel" placeholder="+33 6 XX XX XX XX" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className={inputClass} data-testid="phone-input" />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-heading uppercase tracking-widest text-slate-400">Mot de passe *</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="w-full h-12 pl-10 pr-10 bg-white/[0.05] border border-white/10 text-white placeholder:text-slate-600 outline-none text-sm focus:border-[#ff4500]/40 transition-colors" data-testid="password-input" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-xs font-heading uppercase tracking-widest text-slate-400">Confirmer le mot de passe *</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} className={inputClass} data-testid="confirm-password-input" />
                </div>
              </div>

              {formData.role === 'provider' && (
                <p className="text-[10px] text-amber-400/80 bg-amber-400/10 border border-amber-400/20 p-2">
                  Les comptes partenaires nécessitent une validation par l'administrateur avant activation.
                </p>
              )}

              <button type="submit" disabled={loading} className="w-full h-12 bg-[#ff4500] hover:bg-[#e03e00] text-white font-heading font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2" data-testid="submit-register-btn">
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Création...</>) : 'Créer mon compte'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-slate-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-[#ff4500] font-semibold hover:text-[#ff6a33] transition-colors">Se connecter</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
};

export default RegisterPage;
