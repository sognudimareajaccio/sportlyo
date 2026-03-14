import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Calendar, Users, Zap, BarChart3, Pause, Play } from 'lucide-react';
import { Button } from './ui/button';

const slides = [
  {
    id: 'create',
    tag: 'Etape 1',
    title: 'Creez votre evenement',
    subtitle: 'en quelques clics',
    bullets: [
      'Formulaire intuitif multi-etapes',
      'Configuration des courses et tarifs',
      'Reglement PDF et option T-shirt',
      'Publication instantanee'
    ],
    icon: Calendar,
    image: 'https://static.prod-images.emergentagent.com/jobs/37f79b87-4a2e-49da-93be-445bf533c4a0/images/8d867ae834c9bdd44c35c9dd0e482cec46bd0802ca3ed1e42697f32dc1f78f3d.png',
    accent: '#FF4500'
  },
  {
    id: 'manage',
    tag: 'Etape 2',
    title: 'Gerez les inscriptions',
    subtitle: 'en temps reel',
    bullets: [
      'Suivi des participants et dossards',
      'Jauges de remplissage par course',
      'Paiement securise integre',
      'Export et facturation automatique'
    ],
    icon: Users,
    image: 'https://static.prod-images.emergentagent.com/jobs/37f79b87-4a2e-49da-93be-445bf533c4a0/images/b0e40047b331ec4286343b9068ef6447957c0523c282bdad79e4a99a06e295bf.png',
    accent: '#10b981'
  },
  {
    id: 'checkin',
    tag: 'Jour J',
    title: 'Check-in ultra rapide',
    subtitle: 'sur le terrain',
    bullets: [
      'Scan dossard en 1 seconde',
      'Barre de progression en direct',
      'Contact urgence accessible',
      'Fonctionne sur mobile'
    ],
    icon: Zap,
    image: 'https://static.prod-images.emergentagent.com/jobs/37f79b87-4a2e-49da-93be-445bf533c4a0/images/e4744565d3b0a17ae1cbd6d43d87682f8044895e5ca6d8caab03df9ed85377c3.png',
    accent: '#3b82f6'
  },
  {
    id: 'analytics',
    tag: 'Apres course',
    title: 'Analysez vos resultats',
    subtitle: 'avec des graphiques puissants',
    bullets: [
      'Tendance mensuelle des inscriptions',
      'Revenus par evenement et par course',
      'Taux de check-in et statistiques',
      'Filtres par periode personnalisables'
    ],
    icon: BarChart3,
    image: 'https://static.prod-images.emergentagent.com/jobs/37f79b87-4a2e-49da-93be-445bf533c4a0/images/a1ae304ac0f277b7b5f18c2762ee0f223b9ac9155a1f835a84304cd7eb4505d9.png',
    accent: '#f59e0b'
  }
];

const PlatformSlideshow = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((idx) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const slide = slides[current];
  const SlideIcon = slide.icon;

  const variants = {
    enter: (d) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -300 : 300, opacity: 0 })
  };

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="platform-slideshow"
    >
      {/* Animated dark background */}
      <div className="absolute inset-0 bg-asphalt" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      
      {/* Animated circles */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 border-2 border-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 w-64 h-64 border-2 border-white rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white/30 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/4 right-1/4 w-48 h-48 border border-white/20 rounded-full"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Color accent glow that changes per slide */}
      <motion.div
        className="absolute top-0 right-0 w-1/2 h-full opacity-5 blur-3xl"
        animate={{ backgroundColor: slide.accent }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
            Decouvrez la plateforme
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-3 text-white">
            Tout ce qu'il vous faut
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto text-base leading-relaxed">
            De la creation de votre evenement au suivi des resultats, SportLyo vous accompagne a chaque etape.
          </p>
        </motion.div>

        {/* Slide Content */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
            >
              {/* Left: Text */}
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: slide.accent }}>
                    <SlideIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-heading font-bold uppercase tracking-widest text-xs" style={{ color: slide.accent }}>
                    {slide.tag}
                  </span>
                </div>
                <h3 className="font-heading text-3xl md:text-4xl font-bold uppercase text-white leading-tight">
                  {slide.title}
                </h3>
                <p className="text-slate-400 font-heading text-lg uppercase tracking-wide mt-1 mb-6">
                  {slide.subtitle}
                </p>
                <ul className="space-y-3 mb-8">
                  {slide.bullets.map((b, i) => (
                    <motion.li
                      key={i}
                      className="flex items-center gap-3 text-slate-300 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: slide.accent }} />
                      {b}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Right: Image mockup */}
              <div className="order-1 lg:order-2">
                <div className="relative">
                  {/* Glowing border effect */}
                  <div className="absolute -inset-1 rounded-sm opacity-30 blur-sm" style={{ backgroundColor: slide.accent }} />
                  <div className="relative bg-asphalt/80 border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 border-b border-white/5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="ml-2 text-[9px] text-white/30 font-mono">sportlyo.fr/organizer</span>
                    </div>
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full aspect-[3/2] object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6 mt-12">
          <button onClick={prev} className="p-2 text-white/50 hover:text-white transition-colors" data-testid="slideshow-prev">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3" data-testid="slideshow-dots">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goTo(idx)}
                className="relative group"
                data-testid={`slideshow-dot-${idx}`}
              >
                <div className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'w-10' : 'w-3 hover:w-5'}`}
                  style={{ backgroundColor: idx === current ? slide.accent : 'rgba(255,255,255,0.25)' }}
                />
              </button>
            ))}
          </div>

          <button onClick={next} className="p-2 text-white/50 hover:text-white transition-colors" data-testid="slideshow-next">
            <ChevronRight className="w-5 h-5" />
          </button>

          <button onClick={() => setPaused(!paused)} className="p-2 text-white/30 hover:text-white/60 transition-colors ml-2" data-testid="slideshow-pause">
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Link to="/register">
            <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase tracking-wider px-10 h-14 text-sm gap-3 shadow-lg shadow-brand/20 transition-all hover:shadow-xl hover:shadow-brand/30" data-testid="slideshow-cta">
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-slate-500 text-xs mt-3 font-heading uppercase tracking-wider">
            Aucune carte bancaire requise
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformSlideshow;
