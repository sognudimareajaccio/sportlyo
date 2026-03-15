import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, ChevronRight, Calendar, Users, Zap, BarChart3,
  Pause, Play, MapPin, Euro, CheckCircle, Search, Award, Package, Settings,
  CreditCard, Timer, ShoppingBag, Globe, Headphones, QrCode, FileText,
  Mountain, Bike, Waves, Target, Ticket, Share2, Mail, Shield, Smartphone,
  Clock, TrendingUp, LayoutDashboard
} from 'lucide-react';
import { Button } from './ui/button';

/* ─── Mockup Frame ─── */
const MockupFrame = ({ children, url }) => (
  <div className="relative bg-[#0f172a] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 border-b border-white/5">
      <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
      <div className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
      <span className="ml-2 text-[8px] text-white/25 font-mono">{url}</span>
    </div>
    <div className="bg-slate-50 overflow-hidden" style={{ maxHeight: '380px' }}>
      {children}
    </div>
  </div>
);

/* ─── Slide 1: Config en 5 min ─── */
const MockupConfig = () => (
  <MockupFrame url="sportlyo.fr/organizer/new">
    <div className="bg-asphalt/95 p-4">
      <div className="bg-white rounded-sm max-w-sm mx-auto shadow-xl p-4">
        <h3 className="font-heading font-bold text-sm uppercase mb-1">Creer un evenement</h3>
        <div className="flex gap-0.5 mb-3">
          {['Sport & Lieu', 'Configuration', 'Parcours', 'Epreuves'].map((s, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-0.5 ${i === 0 ? 'bg-brand' : 'bg-slate-200'}`} />
              <span className={`text-[7px] ${i === 0 ? 'text-brand font-bold' : 'text-slate-400'}`}>{s}</span>
            </div>
          ))}
        </div>
        <div className="mb-2">
          <label className="text-[9px] uppercase text-slate-500 font-bold">Nom *</label>
          <div className="border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700">Marathon de Lyon 2026</div>
        </div>
        <div className="mb-2">
          <label className="text-[9px] uppercase text-slate-500 font-bold">Type de sport *</label>
          <div className="grid grid-cols-4 gap-1 mt-0.5">
            {[{ l: 'Cyclisme', a: false }, { l: 'Course', a: true }, { l: 'Triathlon', a: false }, { l: 'Marche', a: false }].map((s, i) => (
              <div key={i} className={`border rounded p-1 text-center text-[8px] ${s.a ? 'border-brand bg-brand/5 text-brand font-bold' : 'border-slate-200 text-slate-400'}`}>{s.l}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div><label className="text-[9px] uppercase text-slate-500 font-bold">Date</label><div className="border rounded px-2 py-1 text-[10px] text-slate-500">15 juin 2026</div></div>
          <div><label className="text-[9px] uppercase text-slate-500 font-bold">Lieu</label><div className="border rounded px-2 py-1 text-[10px] text-slate-500">Lyon, France</div></div>
        </div>
        <div className="mb-2">
          <label className="text-[9px] uppercase text-slate-500 font-bold">Description</label>
          <div className="border rounded px-2 py-1 text-[10px] text-slate-400 h-8">42.195km a travers Lyon...</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-[8px] text-green-600"><CheckCircle className="w-3 h-3" /> Brouillon sauvegarde</div>
          <div className="bg-brand text-white text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-1">Suivant <ArrowRight className="w-2.5 h-2.5" /></div>
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 2: Dashboard temps reel ─── */
const MockupDashboard = () => (
  <MockupFrame url="sportlyo.fr/organizer">
    <div className="bg-asphalt px-3 py-2 flex items-center justify-between">
      <div><h3 className="font-heading font-bold text-[11px] text-white uppercase">Espace Organisateur</h3><p className="text-[8px] text-slate-400">Gerez vos evenements et suivez vos performances</p></div>
      <div className="bg-brand text-white text-[8px] font-bold px-2 py-1 rounded">+ Nouvel Evenement</div>
    </div>
    <div className="p-3 bg-slate-50">
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[{ v: '19', l: 'Evenements', c: 'text-brand' }, { v: '1 247', l: 'Participants', c: 'text-emerald-600' }, { v: '62 450€', l: 'Revenus', c: 'text-brand' }].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 p-2">
            <p className={`font-heading font-black text-base leading-none ${s.c}`}>{s.v}</p>
            <p className="text-[8px] text-slate-400 uppercase">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { icon: Calendar, l: 'Evenements', s: '19 evenement(s)', c: 'bg-brand' },
          { icon: Users, l: 'Participants', s: '1 247 inscrit(s)', c: 'bg-emerald-500' },
          { icon: BarChart3, l: 'Jauges', s: 'Remplissage live', c: 'bg-blue-500' },
          { icon: Zap, l: 'Check-in', s: 'Scan QR & dossards', c: 'bg-teal-500' },
          { icon: Euro, l: 'Finances', s: '62 450€ revenus', c: 'bg-brand' },
          { icon: Mail, l: 'Messages', s: 'Correspondances', c: 'bg-purple-500' },
          { icon: Share2, l: 'Partage', s: 'Reseaux sociaux', c: 'bg-pink-500' },
          { icon: BarChart3, l: 'Statistiques', s: 'Graphiques avances', c: 'bg-amber-500' },
          { icon: Timer, l: 'Chronometrage', s: 'Import temps', c: 'bg-cyan-500' },
          { icon: Award, l: 'Resultats', s: 'Classements', c: 'bg-red-500' },
          { icon: Users, l: 'Partenaires', s: 'Annuaire contacts', c: 'bg-indigo-500' },
          { icon: ShoppingBag, l: 'Boutique', s: 'Produits derives', c: 'bg-lime-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 p-1.5">
            <div className={`w-5 h-5 ${c.c} rounded flex items-center justify-center mb-0.5`}><c.icon className="w-2.5 h-2.5 text-white" /></div>
            <p className="font-heading font-bold text-[8px] uppercase leading-tight">{c.l}</p>
            <p className="text-[6px] text-slate-400 leading-tight">{c.s}</p>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 3: Check-in QR Code ─── */
const MockupCheckin = () => (
  <MockupFrame url="sportlyo.fr/checkin">
    <div className="bg-asphalt px-3 py-2 flex items-center gap-2">
      <Zap className="w-3.5 h-3.5 text-brand" />
      <h3 className="font-heading font-bold text-[11px] text-white">Check-in Jour J</h3>
      <span className="text-[8px] text-slate-400 ml-auto">Marathon de Lyon 2026</span>
    </div>
    <div className="p-3 bg-slate-50 space-y-2">
      <div className="bg-white border border-slate-200 p-2.5">
        <div className="flex items-center justify-between mb-1"><span className="font-heading font-bold text-[9px] uppercase text-slate-600">Progression</span><span className="font-heading font-black text-lg text-brand">73%</span></div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: '73%' }} /></div>
        <div className="grid grid-cols-3 gap-2 mt-1.5 text-center">
          <div><p className="font-heading font-black text-sm text-green-600">912</p><p className="text-[7px] text-slate-400 uppercase">Enregistres</p></div>
          <div><p className="font-heading font-black text-sm text-orange-600">335</p><p className="text-[7px] text-slate-400 uppercase">Restants</p></div>
          <div><p className="font-heading font-black text-sm">1 247</p><p className="text-[7px] text-slate-400 uppercase">Total</p></div>
        </div>
      </div>
      <div className="bg-white border-2 border-brand p-2.5">
        <p className="font-heading font-bold text-[9px] uppercase mb-1">Scanner un dossard</p>
        <div className="flex gap-1.5"><div className="flex-1 border rounded px-2 py-2 text-[10px] text-slate-400 flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> Scan QR ou N dossard...</div><div className="bg-brand text-white px-3 rounded flex items-center"><Search className="w-3.5 h-3.5" /></div></div>
      </div>
      <div className="bg-green-50 border-2 border-green-400 p-2.5 flex items-center gap-2">
        <div className="w-9 h-9 bg-green-500 rounded flex items-center justify-center"><CheckCircle className="w-5 h-5 text-white" /></div>
        <div><p className="font-heading font-bold text-xs text-green-800">Marie Laurent</p><p className="text-[10px] text-green-600">Dossard #287 — Semi-Marathon 21km</p><p className="text-[8px] text-green-500">T-shirt : M | Contact urgence : 06 12 34 56 78</p></div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 4: Paiement securise ─── */
const MockupPaiement = () => (
  <MockupFrame url="sportlyo.fr/events/marathon-lyon/register">
    <div className="p-4 bg-slate-50">
      <div className="max-w-sm mx-auto bg-white border border-slate-200 shadow-lg rounded overflow-hidden">
        <div className="bg-asphalt p-3 text-white"><p className="font-heading font-bold text-xs uppercase">Finaliser l'inscription</p><p className="text-[9px] text-slate-400">Marathon de Lyon 2026 — Semi-Marathon 21km</p></div>
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between py-1.5 border-b"><span className="text-xs text-slate-600">Inscription Semi-Marathon</span><span className="font-heading font-bold text-xs">35.00€</span></div>
          <div className="flex items-center justify-between py-1.5 border-b"><span className="text-xs text-slate-600">T-shirt officiel (M)</span><span className="font-heading font-bold text-xs">15.00€</span></div>
          <div className="flex items-center justify-between py-1.5 border-b"><span className="text-xs text-slate-600">Assurance annulation</span><span className="font-heading font-bold text-xs">3.50€</span></div>
          <div className="flex items-center justify-between py-1.5 font-heading font-bold"><span className="text-sm">Total</span><span className="text-brand text-lg">53.50€</span></div>
          <div className="space-y-1.5 pt-2">
            <div className="border rounded p-2 flex items-center gap-2 border-brand bg-brand/5"><CreditCard className="w-4 h-4 text-brand" /><span className="text-xs font-medium">Carte bancaire</span><span className="ml-auto flex items-center gap-1"><svg viewBox="0 0 48 32" className="h-4 w-6"><rect width="48" height="32" rx="4" fill="#1A1F71"/><text x="24" y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">VISA</text></svg><svg viewBox="0 0 48 32" className="h-4 w-6"><rect width="48" height="32" rx="4" fill="#f5f5f5"/><circle cx="18" cy="16" r="10" fill="#EB001B"/><circle cx="30" cy="16" r="10" fill="#F79E1B"/><path d="M24 8.8a10 10 0 010 14.4 10 10 0 000-14.4z" fill="#FF5F00"/></svg><svg viewBox="0 0 48 32" className="h-4 w-6"><rect width="48" height="32" rx="4" fill="#016FD0"/><text x="24" y="14" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="Arial">AMERICAN</text><text x="24" y="22" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="Arial">EXPRESS</text></svg></span></div>
            <div className="border rounded p-2 flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-500">Apple Pay / Google Pay</span></div>
          </div>
          <div className="bg-brand text-white text-center py-2.5 rounded font-heading font-bold text-xs flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Payer 53.50€ en toute securite</div>
          <p className="text-[7px] text-slate-400 text-center flex items-center justify-center gap-1"><Shield className="w-2.5 h-2.5" /> Paiement securise via Square — Commission transparente 5%</p>
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 5: Chronometrage RFID ─── */
const MockupChrono = () => (
  <MockupFrame url="sportlyo.fr/organizer/chronometrage">
    <div className="p-3 bg-slate-50 space-y-2">
      <div className="bg-white border border-slate-200 p-3">
        <p className="font-heading font-bold text-xs uppercase mb-2">Chronometrage integre</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-blue-50 border border-blue-200 p-2 rounded text-center"><Timer className="w-5 h-5 text-blue-600 mx-auto mb-1" /><p className="text-[9px] font-bold text-blue-800">RaceResult</p><p className="text-[7px] text-blue-500">Compatible</p></div>
          <div className="bg-green-50 border border-green-200 p-2 rounded text-center"><Timer className="w-5 h-5 text-green-600 mx-auto mb-1" /><p className="text-[9px] font-bold text-green-800">MyLaps</p><p className="text-[7px] text-green-500">Compatible</p></div>
        </div>
        <div className="bg-slate-900 rounded p-2 text-[8px] font-mono text-green-400 space-y-0.5">
          <p className="text-slate-500">// Import des temps via API</p>
          <p>POST /api/timing/import</p>
          <p className="text-yellow-400">{'{'} "event_id": "evt_123",</p>
          <p className="text-yellow-400">  "source": "raceresult" {'}'}</p>
          <p className="text-green-400">// 1 247 temps importes</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 p-3">
        <p className="font-heading font-bold text-[9px] uppercase mb-1.5">Resultats en temps reel</p>
        <table className="w-full text-[9px]">
          <thead><tr className="bg-slate-50"><th className="p-1 text-left">#</th><th className="p-1 text-left">Coureur</th><th className="p-1 text-right">Temps</th><th className="p-1 text-right">Ecart</th></tr></thead>
          <tbody>
            {[['1', 'Thomas Dubois', '1:12:34', '-'], ['2', 'Julie Martin', '1:14:02', '+1:28'], ['3', 'Pierre Laurent', '1:15:18', '+2:44']].map(([r, n, t, e], i) => (
              <tr key={i} className="border-b"><td className="p-1 font-bold">{r}</td><td className="p-1">{n}</td><td className="p-1 text-right font-heading font-bold text-brand">{t}</td><td className="p-1 text-right text-slate-400">{e}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 6: Boutique personnalisée ─── */
const MockupBoutique = () => (
  <MockupFrame url="sportlyo.fr/events/marathon/boutique">
    <div className="p-3 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between"><p className="font-heading font-bold text-xs uppercase">Boutique evenement</p><span className="text-[8px] text-slate-400">Marathon de Lyon 2026</span></div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: 'T-shirt Finisher', price: '25€', tag: 'Personnalise', color: 'bg-brand' },
          { name: 'Gourde officielle', price: '12€', tag: 'Eco-responsable', color: 'bg-green-500' },
          { name: 'Casquette running', price: '18€', tag: 'Edition limitee', color: 'bg-blue-500' },
        ].map((p, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className={`${p.color} h-16 flex items-center justify-center`}><ShoppingBag className="w-6 h-6 text-white/60" /></div>
            <div className="p-2"><p className="text-[9px] font-bold leading-tight">{p.name}</p><span className="text-[7px] text-slate-400">{p.tag}</span><p className="font-heading font-bold text-xs text-brand mt-0.5">{p.price}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 p-2.5 rounded">
        <p className="font-heading font-bold text-[9px] uppercase mb-1">Comment ca marche</p>
        <div className="space-y-1.5">
          {['Choisissez les produits du catalogue prestataire', 'Le prestataire personnalise avec votre logo', 'Les participants commandent — zero stock a gerer', 'Vous touchez une commission sur chaque vente'].map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="w-4 h-4 bg-brand rounded-full flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[7px] font-bold">{i + 1}</span></div>
              <span className="text-[8px] text-slate-600">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 7: 18 sports ─── */
const MockupMultisport = () => (
  <MockupFrame url="sportlyo.fr">
    <div className="p-4 bg-slate-50">
      <p className="font-heading font-bold text-xs uppercase text-center mb-3">18 sports disponibles</p>
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
        {[
          { icon: '🏃', l: 'Course a pied' }, { icon: '🚴', l: 'Cyclisme' }, { icon: '🏊', l: 'Triathlon' }, { icon: '🚵', l: 'VTT' },
          { icon: '💪', l: 'CrossFit' }, { icon: '🥊', l: 'Sports combat' }, { icon: '🏎️', l: 'Rallye' }, { icon: '🪂', l: 'Kitesurf' },
          { icon: '⛳', l: 'Golf' }, { icon: '🎯', l: 'Tir a l\'arc' }, { icon: '⚽', l: 'Petanque' }, { icon: '🏸', l: 'Badminton' },
          { icon: '🎳', l: 'Bowling' }, { icon: '🏐', l: 'BMX' }, { icon: '🧗', l: 'Escalade' }, { icon: '🎿', l: 'Ski' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded p-2 text-center hover:border-brand/30 transition-colors">
            <div className="text-lg mb-0.5">{s.icon}</div>
            <p className="text-[7px] font-bold text-slate-600 leading-tight">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="bg-brand/5 border border-brand/20 rounded p-2 mt-3 text-center max-w-sm mx-auto">
        <p className="text-[9px] text-brand font-bold">Votre format est hors-categorie ?</p>
        <p className="text-[8px] text-slate-500">Contactez-nous, on adore relever de nouveaux defis.</p>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 8: Tout inclus ─── */
const MockupToutInclus = () => (
  <MockupFrame url="sportlyo.fr/features">
    <div className="p-3 bg-slate-50">
      <p className="font-heading font-bold text-xs uppercase text-center mb-2">Tout est inclus</p>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { icon: Ticket, l: 'Dossards automatiques' }, { icon: Euro, l: 'Codes promo' }, { icon: FileText, l: 'Export CSV/PDF' },
          { icon: Mountain, l: 'Parcours OpenRunner' }, { icon: BarChart3, l: 'Profil altimetrique' }, { icon: Globe, l: 'Page personnalisee' },
          { icon: Users, l: 'Epreuves multiples' }, { icon: Shield, l: 'Contact urgence' }, { icon: FileText, l: 'Reglement course' },
          { icon: Share2, l: 'Reseaux sociaux' }, { icon: MapPin, l: 'Google Maps' }, { icon: Timer, l: 'Guide chronometrage' },
          { icon: Users, l: 'Gestion equipes' }, { icon: ShoppingBag, l: 'Boutique integree' }, { icon: Mail, l: 'Messagerie' },
        ].map((f, i) => (
          <div key={i} className="bg-white border border-slate-200 p-2 flex items-center gap-1.5 rounded">
            <div className="w-5 h-5 bg-brand/10 rounded flex items-center justify-center shrink-0"><f.icon className="w-3 h-3 text-brand" /></div>
            <span className="text-[8px] font-medium text-slate-700 leading-tight">{f.l}</span>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 9: Statistiques ─── */
const MockupStats = () => (
  <MockupFrame url="sportlyo.fr/organizer/statistiques">
    <div className="p-3 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between"><span className="text-[8px] font-heading uppercase text-slate-400">Periode</span><div className="flex gap-0.5">{['Tout', '30j', '3 mois', '1 an'].map((p, i) => (<span key={i} className={`px-1.5 py-0.5 text-[7px] font-bold rounded ${i === 0 ? 'bg-brand text-white' : 'bg-white border text-slate-500'}`}>{p}</span>))}</div></div>
      <div className="grid grid-cols-3 gap-1.5">
        {[{ l: 'Evenements', v: '19', c: 'text-blue-600', bg: 'bg-blue-50' }, { l: 'Inscriptions', v: '1 247', c: 'text-emerald-600', bg: 'bg-emerald-50' }, { l: 'Revenus', v: '62 450€', c: 'text-brand', bg: 'bg-orange-50' }].map((k, i) => (
          <div key={i} className={`${k.bg} border border-slate-200 p-2`}><p className={`font-heading font-black text-base ${k.c}`}>{k.v}</p><p className="text-[7px] text-slate-500 uppercase">{k.l}</p></div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 p-2.5">
        <p className="font-heading font-bold text-[9px] uppercase mb-1.5">Tendance mensuelle</p>
        <div className="flex items-end gap-0.5 h-20">
          {[35, 52, 41, 68, 45, 72, 58, 85, 63, 78, 92, 88].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full bg-brand/80 rounded-t transition-all" style={{ height: `${v}%` }} />
              <span className="text-[6px] text-slate-400 mt-0.5">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-white border border-slate-200 p-2"><p className="text-[8px] text-slate-400">Taux remplissage</p><p className="font-heading font-black text-xl text-green-600">87%</p></div>
        <div className="bg-white border border-slate-200 p-2"><p className="text-[8px] text-slate-400">Taux check-in</p><p className="font-heading font-black text-xl text-brand">73%</p></div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── Slide 10: Support ─── */
const MockupSupport = () => (
  <MockupFrame url="sportlyo.fr/support">
    <div className="p-4 bg-slate-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="w-8 h-8 bg-brand rounded flex items-center justify-center mb-2"><LayoutDashboard className="w-4 h-4 text-white" /></div>
          <p className="font-heading font-bold text-[10px] uppercase mb-1">Pour l'Organisateur</p>
          <ul className="space-y-1">
            {['Dashboard centralise', 'Gestion inscrits', 'Export des donnees', 'Suivi paiements live'].map((s, i) => (
              <li key={i} className="flex items-center gap-1 text-[8px] text-slate-600"><CheckCircle className="w-2.5 h-2.5 text-green-500 shrink-0" />{s}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-slate-200 rounded p-3">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center mb-2"><Users className="w-4 h-4 text-white" /></div>
          <p className="font-heading font-bold text-[10px] uppercase mb-1">Pour le Participant</p>
          <ul className="space-y-1">
            {['Billet digital & QR', 'Espace personnel', 'Infos de course', 'Inscription rapide'].map((s, i) => (
              <li key={i} className="flex items-center gap-1 text-[8px] text-slate-600"><CheckCircle className="w-2.5 h-2.5 text-green-500 shrink-0" />{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-asphalt rounded p-3 text-center">
        <p className="font-heading font-bold text-white text-xs uppercase">Le jour J, concentrez-vous sur votre course</p>
        <p className="text-[9px] text-slate-400 mt-1">On s'occupe du reste. Support dedie pour vous et vos participants.</p>
        <div className="flex justify-center gap-4 mt-2">
          {[{ v: '< 2h', l: 'Temps de reponse' }, { v: '99.9%', l: 'Disponibilite' }, { v: '24/7', l: 'Support' }].map((s, i) => (
            <div key={i} className="text-center"><p className="font-heading font-black text-base text-brand">{s.v}</p><p className="text-[7px] text-slate-500">{s.l}</p></div>
          ))}
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ─── SLIDES DATA ─── */
const slidesData = [
  { id: 'config', tag: 'Configuration', title: 'Creez votre evenement', subtitle: 'en seulement 5 minutes', bullets: ['Formulaire intuitif et personnalisable', 'Tarifs, options, epreuves : tout se configure', '18 types de sports disponibles', 'Publication instantanee, sans engagement'], icon: Clock, mockup: MockupConfig, accent: '#FF4500' },
  { id: 'dashboard', tag: 'Au quotidien', title: 'Un dashboard puissant', subtitle: '16 modules tout-en-un', bullets: ['Statistiques live : inscriptions, remplissage, revenus', 'Pilotez votre evenement en temps reel', 'Finances, correspondances, partage, partenaires', 'Plus besoin de jongler entre plusieurs logiciels'], icon: LayoutDashboard, mockup: MockupDashboard, accent: '#10b981' },
  { id: 'checkin', tag: 'Jour J', title: 'Check-in par QR Code', subtitle: 'Application de retrait gratuite', bullets: ['Scannez les dossards en un instant', 'Barre de progression en direct', 'Contact urgence accessible immediatement', 'Fonctionne sur mobile, tablette et PC'], icon: QrCode, mockup: MockupCheckin, accent: '#3b82f6' },
  { id: 'paiement', tag: 'Paiements', title: 'Paiement 100% securise', subtitle: 'commission transparente de 5%', bullets: ['Carte bancaire, Apple Pay, Google Pay', 'Commission transparente de 5%, zero frais caches', 'Paiement via Square, leader mondial', 'Codes promo et tarifs personnalisables'], icon: CreditCard, mockup: MockupPaiement, accent: '#8b5cf6' },
  { id: 'chrono', tag: 'Technologie', title: 'Chronometrage integre', subtitle: 'compatible tous les systemes', bullets: ['API RFID : RaceResult, MyLaps et tous chronometreurs', 'Resultats en temps reel pour les participants', 'Guide d\'integration avec snippets de code', 'Import automatique des temps via API ouverte'], icon: Timer, mockup: MockupChrono, accent: '#06b6d4' },
  { id: 'boutique', tag: 'Monetisation', title: 'Boutique personnalisée', subtitle: 'vendez des produits a vos couleurs', bullets: ['T-shirts, gourdes, casquettes personnalises', 'Des prestataires externes de qualite', 'Ventes additionnelles efficaces', 'Catalogue prestataire avec personnalisation logo'], icon: ShoppingBag, mockup: MockupBoutique, accent: '#f59e0b' },
  { id: 'multisport', tag: 'Polyvalent', title: '18 sports, une seule plateforme', subtitle: 'de 50 a 15 000 participants', bullets: ['Course a pied, cyclisme, triathlon, VTT, CrossFit', 'Sports de combat, rallye, kitesurf, golf', 'Tir a l\'arc, petanque, badminton, bowling', 'Format hors-categorie ? On adore les defis'], icon: Award, mockup: MockupMultisport, accent: '#ec4899' },
  { id: 'inclus', tag: 'Tout inclus', title: 'Plus de 15 fonctionnalites', subtitle: 'sans frais supplementaires', bullets: ['Dossards automatiques et billets digitaux', 'Parcours OpenRunner et profil altimetrique', 'Export CSV/PDF, codes promo, gestion equipes', 'Page evenement, carte Google Maps, messagerie'], icon: Package, mockup: MockupToutInclus, accent: '#14b8a6' },
  { id: 'stats', tag: 'Performance', title: 'Statistiques avancees', subtitle: 'prenez les bonnes decisions', bullets: ['Tendance mensuelle inscriptions et revenus', 'Taux de remplissage et de check-in en direct', 'Filtres par periode : 30j, 3 mois, 1 an', 'Graphiques detailles par evenement et par course'], icon: TrendingUp, mockup: MockupStats, accent: '#f97316' },
  { id: 'support', tag: 'Accompagnement', title: 'Support dedie', subtitle: 'pour vous et vos participants', bullets: ['Dashboard centralise avec toutes les informations', 'Espace personnel participant avec billet digital', 'Inscription rapide et pre-remplissage des donnees', 'Le jour J, concentrez-vous sur votre course'], icon: Headphones, mockup: MockupSupport, accent: '#6366f1' },
];

/* ─── MAIN COMPONENT ─── */
const PlatformSlideshow = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((idx) => { setDirection(idx > current ? 1 : -1); setCurrent(idx); }, [current]);
  const next = useCallback(() => { setDirection(1); setCurrent(prev => (prev + 1) % slidesData.length); }, []);
  const prev = useCallback(() => { setDirection(-1); setCurrent(prev => (prev - 1 + slidesData.length) % slidesData.length); }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 7000);
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
    <section className="relative overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} data-testid="platform-slideshow">
      <div className="absolute inset-0 bg-asphalt" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div className="absolute -top-20 -right-20 w-80 h-80 border-2 border-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute -bottom-16 -left-16 w-64 h-64 border-2 border-white rounded-full" animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white/30 rounded-full" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <motion.div className="absolute top-0 right-0 w-1/2 h-full opacity-5 blur-3xl" animate={{ backgroundColor: slide.accent }} transition={{ duration: 0.8 }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        {/* Header */}
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">La plateforme tout-en-un</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-3 text-white">Tout ce qu'il vous faut</h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-base leading-relaxed">Lancez vos inscriptions en 5 minutes. Chronometrage, paiements, dossards automatiques et statistiques en temps reel. Tout est inclus, sans frais caches.</p>
        </motion.div>

        {/* KPI strip */}
        <div className="flex justify-center gap-8 md:gap-14 mb-12">
          {[{ v: '18', l: 'Sports' }, { v: '5%', l: 'Commission' }, { v: '5 min', l: 'Config' }, { v: '0€', l: 'Frais caches' }].map((k, i) => (
            <div key={i} className="text-center">
              <p className="font-heading font-black text-2xl md:text-3xl text-white">{k.v}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-heading">{k.l}</p>
            </div>
          ))}
        </div>

        {/* Slide */}
        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={current} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: 'easeInOut' }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: slide.accent }}><SlideIcon className="w-5 h-5 text-white" /></div>
                  <span className="font-heading font-bold uppercase tracking-widest text-xs" style={{ color: slide.accent }}>{slide.tag}</span>
                  <span className="text-white/20 text-xs ml-auto font-heading">{current + 1}/{slidesData.length}</span>
                </div>
                <h3 className="font-heading text-3xl md:text-4xl font-bold uppercase text-white leading-tight">{slide.title}</h3>
                <p className="text-slate-400 font-heading text-lg uppercase tracking-wide mt-1 mb-6">{slide.subtitle}</p>
                <ul className="space-y-3">
                  {slide.bullets.map((b, i) => (
                    <motion.li key={i} className="flex items-center gap-3 text-slate-300 text-sm" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: slide.accent }} />{b}
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative"><div className="absolute -inset-1 rounded-sm opacity-20 blur-sm" style={{ backgroundColor: slide.accent }} /><div className="relative"><MockupComponent /></div></div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button onClick={prev} className="p-2 text-white/50 hover:text-white transition-colors" data-testid="slideshow-prev"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2" data-testid="slideshow-dots">
            {slidesData.map((s, idx) => (
              <button key={s.id} onClick={() => goTo(idx)} data-testid={`slideshow-dot-${idx}`}>
                <div className={`h-1 rounded-full transition-all duration-500 ${idx === current ? 'w-8' : 'w-2 hover:w-4'}`} style={{ backgroundColor: idx === current ? slide.accent : 'rgba(255,255,255,0.2)' }} />
              </button>
            ))}
          </div>
          <button onClick={next} className="p-2 text-white/50 hover:text-white transition-colors" data-testid="slideshow-next"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setPaused(!paused)} className="p-1.5 text-white/25 hover:text-white/50 transition-colors ml-1" data-testid="slideshow-pause">
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>

        {/* CTA */}
        <motion.div className="text-center mt-10" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} viewport={{ once: true }}>
          <Link to="/register">
            <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase tracking-wider px-10 h-14 text-sm gap-3 shadow-lg shadow-brand/20 transition-all hover:shadow-xl hover:shadow-brand/30" data-testid="slideshow-cta">
              Creer mon evenement gratuitement <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-slate-500 text-xs mt-3 font-heading uppercase tracking-wider">Configuration en 5 minutes — Sans engagement</p>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformSlideshow;
