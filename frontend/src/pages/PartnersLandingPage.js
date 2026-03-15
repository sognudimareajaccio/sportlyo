import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, ShoppingBag, TrendingUp, Globe, Users, Shield,
  Palette, Truck, Star, Award, Megaphone, Eye, Zap, BarChart3,
  HeartHandshake, Package, CreditCard, MessageSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Eye,
    title: 'Visibilite maximale',
    desc: 'Votre catalogue est presente directement aux organisateurs d evenements sportifs. Des milliers de participants potentiels voient vos produits.'
  },
  {
    icon: ShoppingBag,
    title: 'Ventes sans prospection',
    desc: 'Les organisateurs selectionnent vos produits pour leurs evenements. Vous recevez les commandes, sans avoir a chercher de clients.'
  },
  {
    icon: Palette,
    title: 'Personnalisation a la demande',
    desc: 'Les organisateurs personnalisent vos produits avec leur logo et couleurs. Valeur ajoutee maximale, marges protegees.'
  },
  {
    icon: Truck,
    title: 'Logistique simplifiee',
    desc: 'Livraison directe aux organisateurs. Un seul point de livraison par evenement, pas de gestion de stock fragmentee.'
  },
  {
    icon: CreditCard,
    title: 'Paiements securises',
    desc: 'Paiements automatiques via la plateforme. Facturation claire, commission transparente. Zero risque d impayes.'
  },
  {
    icon: BarChart3,
    title: 'Dashboard performant',
    desc: 'Suivez vos ventes, commandes et performances en temps reel. Statistiques detaillees par produit et par evenement.'
  },
  {
    icon: MessageSquare,
    title: 'Messagerie integree',
    desc: 'Communiquez directement avec les organisateurs via la messagerie interne. Questions, validations, suivi de commande.'
  },
  {
    icon: Package,
    title: 'Import catalogue automatise',
    desc: 'Importez votre catalogue depuis TopTex ou XDConnects en un clic. Synchronisation des prix, tailles et disponibilites.'
  }
];

const advantages = [
  'Acces a un reseau d organisateurs qualifies',
  'Aucun frais d inscription',
  'Catalogue en ligne permanent',
  'Notifications nouvelles commandes',
  'Messagerie directe organisateurs',
  'Personnalisation logo & couleurs',
  'Statistiques de ventes detaillees',
  'Facturation automatique',
  'Paiements securises garantis',
  'Support dedie partenaires',
  'Import catalogue TopTex & XDConnects',
  'Visibilite sur tous les evenements'
];

const stats = [
  { value: '0€', label: 'Frais d inscription' },
  { value: '100+', label: 'Evenements par an' },
  { value: '1€', label: 'Commission par produit' },
  { value: '24h', label: 'Delai activation compte' }
];

const steps = [
  {
    num: '01',
    title: 'Inscription gratuite',
    desc: 'Creez votre compte partenaire en quelques minutes. Ajoutez votre catalogue de produits ou importez-le automatiquement.'
  },
  {
    num: '02',
    title: 'Les organisateurs vous choisissent',
    desc: 'Votre catalogue est visible par tous les organisateurs. Ils selectionnent vos produits et les personnalisent pour leurs evenements.'
  },
  {
    num: '03',
    title: 'Vous produisez et livrez',
    desc: 'Recevez les commandes validees avec toutes les specifications. Produisez et livrez directement a l organisateur.'
  },
  {
    num: '04',
    title: 'Vous etes paye automatiquement',
    desc: 'Le paiement est securise via la plateforme. Recevez vos fonds automatiquement apres validation de la livraison.'
  }
];

const testimonials = [
  {
    name: 'Textile Sport Lyon',
    role: 'Fournisseur textile',
    quote: 'Depuis notre inscription sur SportLyo, nos ventes de T-shirts personnalises ont augmente de 40%. La plateforme nous amene des clients que nous n aurions jamais touches seuls.'
  },
  {
    name: 'Trophees Rhone-Alpes',
    role: 'Medailles & trophees',
    quote: 'La messagerie integree avec les organisateurs est un vrai plus. On valide les maquettes en direct, c est beaucoup plus rapide.'
  },
  {
    name: 'Ravitaillement Pro',
    role: 'Alimentation sportive',
    quote: 'Zero prospection, les commandes arrivent directement. On se concentre sur la qualite de nos produits.'
  }
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
            <motion.span
              className="inline-block bg-brand text-white font-heading font-bold uppercase tracking-widest text-xs px-4 py-1.5 mb-6"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            >
              Partenaires & Prestataires
            </motion.span>
            <motion.h1
              className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            >
              Developpez votre activite avec le sport
            </motion.h1>
            <motion.p
              className="text-lg text-slate-300 mt-6 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            >
              Rejoignez la premiere plateforme d evenements sportifs en France. Proposez vos produits et services a des centaines d organisateurs. Zero prospection, que des commandes.
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4 mt-10"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link to="/register">
                <Button className="btn-primary h-14 px-8 text-base gap-2" data-testid="partner-cta-register">
                  Devenir partenaire gratuitement <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              className="flex items-center gap-8 mt-10 text-sm text-slate-400"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Inscription gratuite</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Commission 1€/produit</span>
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

      {/* Features */}
      <section className="py-24" data-testid="partner-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Avantages</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              Pourquoi rejoindre SportLyo ?
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              Une plateforme pensee pour booster votre activite. Concentrez-vous sur votre savoir-faire, on s occupe du reste.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                className="p-6 border border-slate-200 hover:border-brand group transition-all"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.06 }} viewport={{ once: true }} whileHover={{ y: -4 }}
              >
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
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              4 etapes pour commencer a vendre
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, idx) => (
              <motion.div
                key={item.num}
                className="border border-slate-700 p-8"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.1 }} viewport={{ once: true }}
              >
                <span className="text-brand font-heading text-4xl font-bold">{item.num}</span>
                <h3 className="font-heading font-bold text-xl uppercase mt-4 mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Tout inclus</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
                Un ecosysteme complet a votre service
              </h2>
              <p className="text-slate-500 mt-4 leading-relaxed">
                SportLyo met a votre disposition tous les outils pour developper votre activite aupres des organisateurs d evenements sportifs.
              </p>
              <div className="mt-8">
                <Link to="/register">
                  <Button className="btn-primary gap-2" data-testid="partner-cta-advantages">
                    Devenir partenaire <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {advantages.map((a, idx) => (
                <motion.div key={a} className="flex items-center gap-2 p-3 bg-white border border-slate-200" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: idx * 0.03 }} viewport={{ once: true }}>
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span className="text-sm font-medium">{a}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Temoignages</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              Ils nous font confiance
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.name}
                className="p-8 border border-slate-200 border-l-4 border-l-brand"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.1 }} viewport={{ once: true }}
              >
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
          <motion.h2
            className="font-heading text-3xl md:text-5xl font-bold uppercase"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            Pret a developper votre activite ?
          </motion.h2>
          <motion.p
            className="text-lg text-white/80 mt-4"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }}
          >
            Rejoignez SportLyo et accedez a un reseau d organisateurs d evenements sportifs en pleine croissance.
          </motion.p>
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}
          >
            <Link to="/register">
              <Button className="bg-white text-brand hover:bg-slate-100 h-14 px-8 text-base font-heading font-bold uppercase tracking-wider gap-2" data-testid="partner-cta-final">
                Devenir partenaire gratuitement <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-white/60 mt-4">Inscription gratuite. Sans engagement. Commission 1€ par produit.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PartnersLandingPage;
