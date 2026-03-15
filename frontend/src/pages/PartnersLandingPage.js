import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, Star, Shield, Eye, Zap, BarChart3,
  MessageSquare, CreditCard, Users, Award, MapPin,
  Tent, Flag, Timer, Megaphone, TrafficCone, Trash2,
  Utensils, HeartPulse, Sparkles, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

const serviceCategories = [
  { icon: Tent, title: 'Infrastructures', items: ['Location de tentes et chapiteaux', 'Installation de stands', 'Podium et scene', 'Tables et chaises', 'Zones d accueil'] },
  { icon: TrafficCone, title: 'Securite & Balisage', items: ['Barrieres de securite', 'Signaletique', 'Balisage du parcours', 'Zones spectateurs', 'Societes de securite privee'] },
  { icon: Flag, title: 'Course & Technique', items: ['Installation departs et arrivees', 'Zones de ravitaillement', 'Chronometrage', 'Zones techniques', 'Gestion des dossards'] },
  { icon: Sparkles, title: 'Services & Logistique', items: ['Nettoyage du site', 'Gestion des dechets', 'Sanitaires mobiles', 'Alimentation electrique', 'Sono et eclairage'] }
];

const features = [
  { icon: Eye, title: 'Visibilite aupres des organisateurs', desc: 'Votre entreprise est presentee directement aux organisateurs d evenements sportifs de votre region. Ils vous trouvent sans que vous ayez a prospecter.' },
  { icon: Users, title: 'Reseau d evenements sportifs', desc: 'Marathon, trail, cyclisme, triathlon... Des centaines d organisateurs recherchent des prestataires fiables pour leurs evenements chaque annee.' },
  { icon: CreditCard, title: 'Devis et paiements simplifies', desc: 'Recevez des demandes de devis directement sur la plateforme. Facturez et encaissez en toute securite via le systeme de paiement integre.' },
  { icon: MessageSquare, title: 'Messagerie directe', desc: 'Communiquez avec les organisateurs via la messagerie integree. Coordonnez les details logistiques, plannings et specifications techniques.' },
  { icon: BarChart3, title: 'Suivi des prestations', desc: 'Tableau de bord complet pour suivre vos missions, vos revenus et vos avis clients. Analysez vos performances et developpez votre activite.' },
  { icon: Award, title: 'Reputation et avis', desc: 'Chaque prestation reussie renforce votre reputation sur la plateforme. Les avis positifs attirent de nouveaux organisateurs.' },
  { icon: MapPin, title: 'Zone geographique ciblee', desc: 'Definissez votre rayon d intervention. Recevez uniquement les demandes qui correspondent a votre zone d activite.' },
  { icon: Shield, title: 'Contrats securises', desc: 'Cadre contractuel clair entre vous et les organisateurs. Conditions, delais et paiements definis en amont pour zero mauvaise surprise.' }
];

const steps = [
  { num: '01', title: 'Creez votre profil', desc: 'Inscrivez-vous gratuitement et completez votre fiche : activites proposees, zone geographique, tarifs indicatifs, photos de realisations.' },
  { num: '02', title: 'Recevez des demandes', desc: 'Les organisateurs consultent votre profil et vous envoient des demandes de devis pour leurs evenements. Vous etes notifie en temps reel.' },
  { num: '03', title: 'Realisez la prestation', desc: 'Coordonnez les details avec l organisateur via la messagerie. Intervenez le jour J selon le cahier des charges valide.' },
  { num: '04', title: 'Soyez paye et note', desc: 'Encaissez votre prestation via la plateforme. Recevez un avis de l organisateur qui renforce votre visibilite.' }
];

const stats = [
  { value: '0€', label: 'Inscription gratuite' },
  { value: '100+', label: 'Evenements par an' },
  { value: '15+', label: 'Categories de services' },
  { value: '24h', label: 'Activation du compte' }
];

const testimonials = [
  { name: 'SecuriSport Lyon', role: 'Securite evenementielle', quote: 'Depuis notre inscription, nous avons triple nos missions evenementielles. Les organisateurs nous contactent directement via la plateforme, c est d une efficacite redoutable.' },
  { name: 'ChronoTime', role: 'Chronometrage sportif', quote: 'SportLyo nous a permis de nous faire connaitre aupres d organisateurs qu on n aurait jamais touches. Le systeme de devis en ligne nous fait gagner un temps precieux.' },
  { name: 'EcoClean Events', role: 'Nettoyage et gestion dechets', quote: 'La plateforme nous amene des missions regulieres. Les avis clients positifs nous ont aide a developper notre reputation dans l evenementiel sportif.' }
];

const PartnersLandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-asphalt text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <motion.span className="inline-block bg-brand text-white font-heading font-bold uppercase tracking-widest text-xs px-4 py-1.5 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              Partenaires evenementiels
            </motion.span>
            <motion.h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              Devenez le partenaire incontournable des evenements sportifs
            </motion.h1>
            <motion.p className="text-lg text-slate-300 mt-6 max-w-xl leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              Tentes, podiums, securite, chronometrage, nettoyage... Proposez vos services aux organisateurs d evenements sportifs de votre region. Zero prospection, des missions toute l annee.
            </motion.p>
            <motion.div className="flex flex-wrap gap-4 mt-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Link to="/register">
                <Button className="btn-primary h-14 px-8 text-base gap-2" data-testid="partner-cta-register">
                  Devenir partenaire <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div className="flex items-center gap-8 mt-10 text-sm text-slate-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Inscription gratuite</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Missions toute l annee</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.1 }} viewport={{ once: true }}>
                <div className="font-heading text-4xl font-bold">{s.value}</div>
                <div className="text-sm text-white/80 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Categories */}
      <section className="py-24 bg-slate-50" data-testid="partner-services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Services recherches</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">Les organisateurs ont besoin de vous</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Quel que soit votre metier, les evenements sportifs ont besoin de prestataires professionnels pour chaque aspect de l organisation.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serviceCategories.map((cat, idx) => (
              <motion.div key={cat.title} className="bg-white border border-slate-200 p-6 hover:border-brand transition-colors" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.08 }} viewport={{ once: true }}>
                <cat.icon className="w-10 h-10 text-brand mb-4" />
                <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-4">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24" data-testid="partner-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Avantages</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">Pourquoi rejoindre SportLyo ?</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Une plateforme pensee pour developper votre activite de prestations evenementielles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => (
              <motion.div key={f.title} className="p-6 border border-slate-200 hover:border-brand group transition-all" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.06 }} viewport={{ once: true }} whileHover={{ y: -4 }}>
                <f.icon className="w-10 h-10 text-brand mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-asphalt text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Comment ca marche</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">4 etapes pour recevoir vos premieres missions</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, idx) => (
              <motion.div key={item.num} className="border border-slate-700 p-8" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.1 }} viewport={{ once: true }}>
                <span className="text-brand font-heading text-4xl font-bold">{item.num}</span>
                <h3 className="font-heading font-bold text-xl uppercase mt-4 mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Temoignages</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">Ils nous font confiance</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div key={t.name} className="p-8 border border-slate-200 border-l-4 border-l-brand" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.1 }} viewport={{ once: true }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-brand fill-brand" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic mb-6">"{t.quote}"</p>
                <div>
                  <p className="font-heading font-bold uppercase tracking-wider text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="font-heading text-3xl md:text-5xl font-bold uppercase" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            Pret a recevoir vos premieres missions ?
          </motion.h2>
          <motion.p className="text-lg text-white/80 mt-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            Rejoignez le reseau de partenaires evenementiels SportLyo et developpez votre activite toute l annee.
          </motion.p>
          <motion.div className="mt-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <Link to="/register">
              <Button className="bg-white text-brand hover:bg-slate-100 h-14 px-8 text-base font-heading font-bold uppercase tracking-wider gap-2" data-testid="partner-cta-final">
                Devenir partenaire gratuitement <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-white/60 mt-4">Inscription gratuite. Sans engagement. Premieres missions sous 24h.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PartnersLandingPage;
