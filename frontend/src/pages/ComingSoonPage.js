import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, ChevronRight, Zap, Shield, Timer, Trophy, Bike, Footprints, Mountain, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/9f7c92b2-b7af-453b-aa7f-25425becca07/images/99f7fe87d5c1c35396c9c2f8b0e1b24d2d3dec6c12be75aeab1e17843c7cbcea.png";

const features = [
  { icon: Zap, title: "Inscription instantanée", desc: "Parcours d'inscription fluide en 3 étapes" },
  { icon: Timer, title: "Chronométrage live", desc: "Résultats en temps réel par puce RFID" },
  { icon: Shield, title: "Paiement sécurisé", desc: "Transactions protégées par Square" },
  { icon: Trophy, title: "Dossard digital", desc: "QR code et billet dématérialisé" },
];

const sports = [
  { icon: Footprints, name: "Running" },
  { icon: Mountain, name: "Trail" },
  { icon: Bike, name: "Cyclisme" },
  { icon: Trophy, name: "Triathlon" },
  { icon: Users, name: "Relais" },
  { icon: Zap, name: "CrossFit" },
];

const ComingSoonPage = ({ onAccessGranted }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [showAccess, setShowAccess] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    try { await api.post('/waitlist-email', { email }); } catch {}
    setSubmitted(true);
    toast.success('Parfait ! Vous serez parmi les premiers informés.');
  };

  const handleAccessKey = (e) => {
    e.preventDefault();
    if (accessKey === 'SPORTLYO2026') {
      localStorage.setItem('sportlyo_preview', 'true');
      onAccessGranted();
      toast.success('Bienvenue !');
    } else {
      toast.error('Code incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-white relative overflow-hidden" data-testid="coming-soon-page">

      {/* Animated Background */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/60 via-[#050a14]/30 to-[#050a14]" />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,69,0,0.12) 0%, transparent 70%)',
            left: `${mousePos.x * 100 - 20}%`,
            top: `${mousePos.y * 100 - 20}%`,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 100 }}
        />
      </div>

      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

      {/* Content */}
      <div className="relative z-10">

        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-6">
          <motion.img
            src="/logo-light.png"
            alt="SportLyo"
            className="h-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline text-xs text-slate-500 font-heading uppercase tracking-widest">Lancement 2026</span>
            <div className="w-2 h-2 rounded-full bg-[#ff4500] animate-pulse" />
          </motion.div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-heading font-bold uppercase tracking-[3px] border border-[#ff4500]/30 text-[#ff4500] backdrop-blur-sm bg-[#ff4500]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4500] animate-pulse" />
              Bientôt disponible
            </span>
          </motion.div>

          <motion.h1
            className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.85] tracking-tighter"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <span className="block text-white">Sport</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ff4500] to-[#ff6a33]">Lyo</span>
          </motion.h1>

          <motion.p
            className="mt-6 text-lg md:text-xl text-slate-400 max-w-lg mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            La plateforme qui révolutionne l'inscription aux événements sportifs.
            <span className="text-white font-medium"> Simple. Rapide. Puissante.</span>
          </motion.p>

          {/* Email CTA */}
          <motion.div
            className="mt-10 w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmitEmail}
                  className="relative"
                  data-testid="coming-soon-form"
                >
                  <div className="flex bg-white/[0.06] backdrop-blur-xl border border-white/10 overflow-hidden hover:border-[#ff4500]/30 transition-colors">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        placeholder="Entrez votre email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-14 pl-11 pr-4 bg-transparent text-white placeholder:text-slate-500 outline-none text-sm"
                        required
                        data-testid="coming-soon-email"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-14 px-6 bg-[#ff4500] hover:bg-[#e03e00] text-white font-heading font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
                      data-testid="coming-soon-submit"
                    >
                      Notifier <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-3 h-14 bg-[#ff4500]/10 border border-[#ff4500]/30 backdrop-blur-xl"
                  data-testid="coming-soon-success"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ff4500] flex items-center justify-center">
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-white font-medium">Vous êtes sur la liste VIP</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sports Marquee */}
          <motion.div
            className="mt-16 flex items-center gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            {sports.map((s, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-2 group"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.2 + i * 0.08 }}
              >
                <div className="w-12 h-12 border border-white/10 flex items-center justify-center group-hover:border-[#ff4500]/50 group-hover:bg-[#ff4500]/5 transition-all">
                  <s.icon className="w-5 h-5 text-slate-500 group-hover:text-[#ff4500] transition-colors" />
                </div>
                <span className="text-[10px] text-slate-600 font-heading uppercase tracking-widest group-hover:text-slate-400 transition-colors">{s.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Features */}
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="p-6 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-[#ff4500]/20 hover:bg-[#ff4500]/[0.03] transition-all group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <f.icon className="w-6 h-6 text-[#ff4500] mb-4" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 pb-20">
          <div className="max-w-3xl mx-auto flex justify-center gap-16 md:gap-24">
            {[
              { val: '50+', label: 'Événements' },
              { val: '18', label: 'Disciplines' },
              { val: '5%', label: 'Commission' },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <p className="font-heading text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">{s.val}</p>
                <p className="text-xs text-slate-600 font-heading uppercase tracking-widest mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer with discreet access */}
        <footer className="px-6 md:px-12 py-8 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo-light.png" alt="SportLyo" className="h-6 opacity-40" />
              <span className="text-[11px] text-slate-700">
                Conception <a href="https://www.webisula.com/" target="_blank" rel="noopener noreferrer" className="text-[#ff4500]/60 hover:text-[#ff4500]">WEBISULA</a>
              </span>
            </div>

            {/* Discreet access */}
            <div>
              {!showAccess ? (
                <button
                  onClick={() => setShowAccess(true)}
                  className="w-8 h-8 border border-white/[0.06] flex items-center justify-center hover:border-[#ff4500]/30 transition-all group"
                  data-testid="show-access-key"
                  title="Accès"
                >
                  <Lock className="w-3 h-3 text-slate-700 group-hover:text-[#ff4500]/60 transition-colors" />
                </button>
              ) : (
                <motion.form
                  onSubmit={handleAccessKey}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  data-testid="access-key-form"
                >
                  <input
                    type="password"
                    placeholder="Code"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className="w-32 h-8 px-3 bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#ff4500]/30"
                    autoFocus
                    data-testid="access-key-input"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-[#ff4500]/10 border border-[#ff4500]/20 text-[#ff4500] text-xs font-bold hover:bg-[#ff4500]/20 transition-colors"
                    data-testid="access-key-submit"
                  >
                    OK
                  </button>
                </motion.form>
              )}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default ComingSoonPage;
