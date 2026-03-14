import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Calendar, Users, Zap, BarChart3, Pause, Play, MapPin, Euro, CheckCircle, Search, Heart, Award, Package, Settings } from 'lucide-react';
import { Button } from './ui/button';

/* ─── CSS Mockup Components ─── */
const MockupFrame = ({ children, url }) => (
  <div className="relative bg-[#0f172a] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
    <div className="flex items-center gap-1.5 px-3 py-2 bg-black/50 border-b border-white/5">
      <div className="w-2 h-2 rounded-full bg-red-400/80" />
      <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
      <div className="w-2 h-2 rounded-full bg-green-400/80" />
      <span className="ml-2 text-[9px] text-white/25 font-mono">{url}</span>
    </div>
    <div className="bg-slate-50 overflow-hidden" style={{ maxHeight: '380px' }}>
      {children}
    </div>
  </div>
);

const MockupCreateEvent = () => (
  <MockupFrame url="sportlyo.fr/organizer">
    <div className="bg-asphalt/95 p-6">
      <div className="bg-white rounded-sm max-w-md mx-auto shadow-xl p-5">
        <h3 className="font-heading font-bold text-base uppercase mb-1">Creer un evenement</h3>
        <div className="flex gap-1 mb-4">
          {['Sport & Lieu', 'Configuration', 'Parcours', 'Epreuves'].map((s, i) => (
            <div key={i} className={`flex-1 h-0.5 ${i === 0 ? 'bg-brand' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="mb-3">
          <label className="text-[10px] uppercase text-slate-500 font-bold">Nom *</label>
          <div className="border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 bg-white">Marathon de Lyon 2026</div>
        </div>
        <div className="mb-3">
          <label className="text-[10px] uppercase text-slate-500 font-bold">Type de sport *</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {[
              { icon: '🚴', label: 'Cyclisme' },
              { icon: '🏃', label: 'Course', active: true },
              { icon: '🏊', label: 'Triathlon' },
              { icon: '🚶', label: 'Marche' },
            ].map((s, i) => (
              <div key={i} className={`border rounded p-1.5 text-center text-[9px] ${s.active ? 'border-brand bg-brand/5 text-brand font-bold' : 'border-slate-200 text-slate-500'}`}>
                <div className="text-base mb-0.5">{s.icon}</div>
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] uppercase text-slate-500 font-bold">Date *</label>
            <div className="border rounded px-2 py-1.5 text-xs flex items-center gap-1 text-slate-500"><Calendar className="w-3 h-3" /> 15 juin 2026</div>
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-500 font-bold">Lieu *</label>
            <div className="border rounded px-2 py-1.5 text-xs flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3" /> Lyon, France</div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-brand text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1">Suivant <ArrowRight className="w-3 h-3" /></div>
        </div>
      </div>
    </div>
  </MockupFrame>
);

const MockupDashboard = () => (
  <MockupFrame url="sportlyo.fr/organizer">
    <div className="bg-asphalt px-4 py-3 flex items-center justify-between">
      <div>
        <h3 className="font-heading font-bold text-sm text-white uppercase">Espace Organisateur</h3>
        <p className="text-[10px] text-slate-400">Gerez vos evenements et suivez vos performances</p>
      </div>
      <div className="bg-brand text-white text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-1">+ Nouvel Evenement</div>
    </div>
    <div className="p-4 bg-slate-50">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { icon: Calendar, value: '19', label: 'Evenements', color: 'text-brand' },
          { icon: Users, value: '247', label: 'Participants', color: 'text-emerald-600' },
          { icon: Euro, value: '12 450€', label: 'Revenus', color: 'text-brand' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 p-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center"><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <div>
              <p className={`font-heading font-black text-lg leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-400 uppercase">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Calendar, label: 'Evenements', sub: '19 evenement(s)', color: 'bg-brand' },
          { icon: Users, label: 'Participants', sub: '247 inscrit(s)', color: 'bg-emerald-500' },
          { icon: BarChart3, label: 'Jauges', sub: 'Remplissage temps reel', color: 'bg-blue-500' },
          { icon: Zap, label: 'Check-in', sub: 'Scan QR & dossards', color: 'bg-teal-500' },
          { icon: Euro, label: 'Finances', sub: '12 450€ de revenus', color: 'bg-brand' },
          { icon: BarChart3, label: 'Statistiques', sub: 'Graphiques avances', color: 'bg-purple-500' },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 p-3 hover:border-brand/30 transition-colors">
            <div className={`w-7 h-7 ${c.color} rounded flex items-center justify-center mb-1.5`}>
              <c.icon className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="font-heading font-bold text-xs uppercase">{c.label}</p>
            <p className="text-[9px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

const MockupCheckin = () => (
  <MockupFrame url="sportlyo.fr/checkin">
    <div className="bg-asphalt px-4 py-3 flex items-center gap-2">
      <Zap className="w-4 h-4 text-brand" />
      <h3 className="font-heading font-bold text-sm text-white">Check-in Jour J</h3>
      <span className="text-[10px] text-slate-400 ml-auto">Marathon de Lyon 2026</span>
    </div>
    <div className="p-4 bg-slate-50 space-y-3">
      {/* Progress */}
      <div className="bg-white border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-heading font-bold text-xs uppercase text-slate-600">Progression</span>
          <span className="font-heading font-black text-xl text-brand">73%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '73%' }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <div><p className="font-heading font-black text-lg text-green-600">182</p><p className="text-[9px] text-slate-400 uppercase">Enregistres</p></div>
          <div><p className="font-heading font-black text-lg text-orange-600">67</p><p className="text-[9px] text-slate-400 uppercase">Restants</p></div>
          <div><p className="font-heading font-black text-lg">249</p><p className="text-[9px] text-slate-400 uppercase">Total</p></div>
        </div>
      </div>
      {/* Scan input */}
      <div className="bg-white border-2 border-brand p-3">
        <p className="font-heading font-bold text-xs uppercase mb-2">Scanner un dossard</p>
        <div className="flex gap-2">
          <div className="flex-1 border border-slate-200 rounded px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
            <Search className="w-4 h-4" /> N dossard ou nom...
          </div>
          <div className="bg-brand text-white px-4 rounded flex items-center"><Search className="w-4 h-4" /></div>
        </div>
      </div>
      {/* Success */}
      <div className="bg-green-50 border-2 border-green-400 p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center"><CheckCircle className="w-6 h-6 text-white" /></div>
        <div>
          <p className="font-heading font-bold text-sm text-green-800">Pierre Dupont</p>
          <p className="text-xs text-green-600">Dossard #142 — Marathon 42km</p>
        </div>
      </div>
    </div>
  </MockupFrame>
);

const MockupAnalytics = () => (
  <MockupFrame url="sportlyo.fr/organizer/statistiques">
    <div className="p-4 bg-slate-50 space-y-3">
      {/* Period filter */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-heading uppercase text-slate-400">Periode</span>
        <div className="flex gap-1">
          {['Tout', '30j', '3 mois', '1 an'].map((p, i) => (
            <span key={i} className={`px-2 py-1 text-[9px] font-bold rounded ${i === 0 ? 'bg-brand text-white' : 'bg-white border text-slate-500'}`}>{p}</span>
          ))}
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Evenements', value: '19', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Inscriptions', value: '247', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Revenus', value: '12 450€', color: 'text-brand', bg: 'bg-orange-50' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} border border-slate-200 p-2.5`}>
            <p className={`font-heading font-black text-lg ${k.color}`}>{k.value}</p>
            <p className="text-[9px] text-slate-500 uppercase">{k.label}</p>
          </div>
        ))}
      </div>
      {/* Mock chart */}
      <div className="bg-white border border-slate-200 p-3">
        <p className="font-heading font-bold text-xs uppercase mb-2">Tendance mensuelle</p>
        <div className="flex items-end gap-1 h-24">
          {[35, 52, 41, 68, 45, 72, 58, 85, 63, 78, 92, 88].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full bg-brand/80 rounded-t" style={{ height: `${v}%` }} />
              <span className="text-[7px] text-slate-400 mt-0.5">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          <span className="text-[9px] text-slate-400 flex items-center gap-1"><span className="w-2 h-2 bg-brand rounded" /> Inscriptions</span>
          <span className="text-[9px] text-slate-400 flex items-center gap-1"><span className="w-2 h-2 bg-asphalt rounded" /> Revenus</span>
        </div>
      </div>
      {/* Top events */}
      <div className="bg-white border border-slate-200 p-3">
        <p className="font-heading font-bold text-xs uppercase mb-2">Top evenements</p>
        {['Marathon de Lyon', 'Trail des Monts', 'CrossFit Games'].map((e, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-brand/10 text-brand text-[9px] font-bold rounded flex items-center justify-center">{i + 1}</span>
              <span className="text-xs font-medium">{e}</span>
            </div>
            <span className="text-xs font-heading font-bold text-brand">{[4850, 3200, 2100][i]}€</span>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

const slidesData = [
  {
    id: 'create',
    tag: 'Etape 1',
    title: 'Creez votre evenement',
    subtitle: 'en quelques clics',
    bullets: [
      'Formulaire intuitif multi-etapes',
      'Plus de 15 types de sports disponibles',
      'Reglement PDF et option T-shirt',
      'Publication instantanee'
    ],
    icon: Calendar,
    mockup: MockupCreateEvent,
    accent: '#FF4500'
  },
  {
    id: 'manage',
    tag: 'Au quotidien',
    title: 'Votre tableau de bord',
    subtitle: 'tout en un seul endroit',
    bullets: [
      'Vue d\'ensemble avec 16 modules',
      'Suivi participants et inscriptions',
      'Finances, correspondances, partage',
      'Gestion partenaires et sponsors'
    ],
    icon: Settings,
    mockup: MockupDashboard,
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
      'Fonctionne sur mobile et tablette'
    ],
    icon: Zap,
    mockup: MockupCheckin,
    accent: '#3b82f6'
  },
  {
    id: 'analytics',
    tag: 'Apres course',
    title: 'Analysez vos performances',
    subtitle: 'avec des graphiques puissants',
    bullets: [
      'Tendance mensuelle des inscriptions',
      'Revenus par evenement et par course',
      'Taux de check-in et statistiques',
      'Filtres par periode personnalisables'
    ],
    icon: BarChart3,
    mockup: MockupAnalytics,
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
    setCurrent(prev => (prev + 1) % slidesData.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slidesData.length) % slidesData.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const slide = slidesData[current];
  const SlideIcon = slide.icon;
  const MockupComponent = slide.mockup;

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

      {/* Color accent glow */}
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
        <div className="relative min-h-[420px]">
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

              {/* Right: CSS Mockup */}
              <div className="order-1 lg:order-2">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-sm opacity-20 blur-sm" style={{ backgroundColor: slide.accent }} />
                  <div className="relative">
                    <MockupComponent />
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
            {slidesData.map((s, idx) => (
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
              Creer mon compte organisateur <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-slate-500 text-xs mt-3 font-heading uppercase tracking-wider">
            Gratuit — Aucune carte bancaire requise
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformSlideshow;
