import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MapPin, Timer, Trophy, Users, Bike, Footprints } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../services/api';

const ComingSoonPage = ({ onAccessGranted }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [showAccess, setShowAccess] = useState(false);

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await api.post('/waitlist-email', { email });
    } catch {}
    setSubmitted(true);
    toast.success('Merci ! Vous serez notifié du lancement.');
  };

  const handleAccessKey = (e) => {
    e.preventDefault();
    if (accessKey === 'SPORTLYO2026') {
      localStorage.setItem('sportlyo_preview', 'true');
      onAccessGranted();
      toast.success('Accès accordé !');
    } else {
      toast.error('Clé incorrecte');
    }
  };

  const sports = [
    { icon: Footprints, label: 'Trail & Running' },
    { icon: Bike, label: 'Cyclisme' },
    { icon: Trophy, label: 'Triathlon' },
    { icon: Timer, label: 'Chrono en direct' },
  ];

  return (
    <div className="min-h-screen bg-asphalt text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-96 h-96 bg-brand rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-brand flex items-center justify-center">
              <span className="text-white font-heading font-bold text-2xl">SL</span>
            </div>
            <span className="font-heading text-4xl font-extrabold tracking-tight">
              SPORT<span className="text-brand">LYO</span>
            </span>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center max-w-2xl mb-12"
        >
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase mb-4 leading-tight">
            Votre plateforme<br />
            <span className="text-brand">d'inscription sportive</span><br />
            arrive bientôt
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">
            Inscriptions, paiements, chronos, dossards — tout au m&ecirc;me endroit.
            Organisateurs et participants, pr&eacute;parez-vous.
          </p>
        </motion.div>

        {/* Sports icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex gap-8 mb-12"
        >
          {sports.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 border border-slate-700 flex items-center justify-center hover:border-brand transition-colors">
                <s.icon className="w-6 h-6 text-brand" />
              </div>
              <span className="text-xs text-slate-500 font-heading uppercase">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Email signup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="w-full max-w-md"
        >
          {!submitted ? (
            <form onSubmit={handleSubmitEmail} className="flex gap-2" data-testid="coming-soon-form">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="Votre email pour &ecirc;tre notifi&eacute;"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-12"
                  required
                  data-testid="coming-soon-email"
                />
              </div>
              <Button type="submit" className="bg-brand hover:bg-brand/90 h-12 px-6 gap-2" data-testid="coming-soon-submit">
                Me notifier <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="text-center bg-slate-800/50 border border-green-800 p-4" data-testid="coming-soon-success">
              <p className="text-green-400 font-medium">Merci ! Nous vous contacterons au lancement.</p>
            </div>
          )}
        </motion.div>

        {/* Stats preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex gap-12 mt-16 text-center"
        >
          {[
            { value: '50+', label: '\u00c9v\u00e9nements pr\u00e9vus' },
            { value: '5%', label: 'Frais de service' },
            { value: '100%', label: 'Reversement organisateur' },
          ].map((stat, i) => (
            <div key={i}>
              <p className="font-heading text-2xl font-extrabold text-brand">{stat.value}</p>
              <p className="text-xs text-slate-500 uppercase">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Secret access link */}
        <div className="mt-16">
          {!showAccess ? (
            <button
              onClick={() => setShowAccess(true)}
              className="text-slate-600 text-xs hover:text-slate-400 transition-colors cursor-pointer"
              data-testid="show-access-key"
            >
              Acc&egrave;s &eacute;quipe
            </button>
          ) : (
            <form onSubmit={handleAccessKey} className="flex gap-2 items-center" data-testid="access-key-form">
              <Input
                type="password"
                placeholder="Cl&eacute; d'acc&egrave;s"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-48 bg-slate-800 border-slate-700 text-white text-sm h-9"
                data-testid="access-key-input"
              />
              <Button type="submit" size="sm" variant="outline" className="border-slate-700 text-slate-400 h-9" data-testid="access-key-submit">
                Entrer
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
