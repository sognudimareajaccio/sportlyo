import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Clock, CreditCard, BarChart3, QrCode, Users, Shield, Headphones,
  Bike, Footprints, Medal, Car, Mountain, Target, Wind, Flag, CircleDot,
  Dumbbell, Swords, ChevronRight, Check, ArrowRight, Globe, Timer, ShoppingBag
} from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Clock,
    title: 'Configuration en 5 minutes',
    desc: 'Formulaire intuitif et personnalisable. Tarifs, options, epreuves : tout se configure en quelques clics.'
  },
  {
    icon: QrCode,
    title: 'Check-in par QR Code',
    desc: 'Application de retrait gratuite. Scannez les dossards le jour J en un instant.'
  },
  {
    icon: BarChart3,
    title: 'Dashboard temps reel',
    desc: 'Statistiques live : inscriptions, remplissage, revenus. Pilotez votre evenement en direct.'
  },
  {
    icon: CreditCard,
    title: 'Paiement securise Stripe',
    desc: 'Paiements CB, Apple Pay, Google Pay. Commission transparente de 5%, zero frais caches.'
  },
  {
    icon: Timer,
    title: 'Chronometrage integre',
    desc: 'API RFID compatible tous les systemes (RaceResult, MyLaps). Resultats en temps reel.'
  },
  {
    icon: Shield,
    title: 'Gestion PPS & Licences',
    desc: 'Verification automatique des PPS et licences FFA. Validation des documents integree.'
  },
  {
    icon: ShoppingBag,
    title: 'Boutique personnalisee',
    desc: 'Vendez des produits derives a vos couleurs grace a nos prestataires partenaires. Commission sur chaque vente, zero stock a gerer.'
  }
];

const advantages = [
  'Dossards automatiques',
  'Codes promo personnalises',
  'Export CSV/PDF des inscrits',
  'Parcours OpenRunner integre',
  'Profil altimetrique',
  'Page evenement personnalisee',
  'Gestion des epreuves multiples',
  'Contact urgence participants',
  'Reglement de course integre',
  'Liens reseaux sociaux',
  'Carte Google Maps integree',
  'Guide chronometrage avec snippets',
  'Partage sur reseaux sociaux',
  'Gestion des equipes',
  'Boutique produits derives integree',
  'Messagerie prestataires & admin'
];

const sports = [
  { name: 'Course a pied', icon: Footprints },
  { name: 'Cyclisme', icon: Bike },
  { name: 'Triathlon', icon: Medal },
  { name: 'VTT', icon: Mountain },
  { name: 'CrossFit', icon: Dumbbell },
  { name: 'Sports de combat', icon: Swords },
  { name: 'Rallye', icon: Car },
  { name: 'Kitesurf', icon: Wind },
  { name: 'Golf', icon: Flag },
  { name: 'Tir a l arc', icon: Target },
  { name: 'Petanque', icon: CircleDot },
  { name: 'Et bien plus...', icon: Globe }
];

const stats = [
  { value: '18', label: 'Sports disponibles' },
  { value: '5%', label: 'Commission transparente' },
  { value: '5min', label: 'Pour creer un evenement' },
  { value: '0€', label: 'De frais caches' }
];

const OrgaLandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-asphalt text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-brand rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <motion.span
              className="inline-block bg-brand text-white font-heading font-bold uppercase tracking-widest text-xs px-4 py-1.5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              Organisateurs
            </motion.span>
            <motion.h1
              className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              La plateforme tout-en-un pour vos evenements sportifs
            </motion.h1>
            <motion.p
              className="text-lg text-slate-300 mt-6 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Lancez vos inscriptions en 5 minutes. Chronometrage, paiements, dossards automatiques et statistiques en temps reel. Tout est inclus, sans frais caches.
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4 mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link to="/register">
                <Button className="btn-primary h-14 px-8 text-base gap-2" data-testid="orga-cta-register">
                  Creer mon evenement gratuitement <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              className="flex items-center gap-8 mt-10 text-sm text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Config en 5 min</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brand" /> Compatible tous chronometreurs</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="font-heading text-4xl font-bold">{s.value}</div>
                <div className="text-sm text-white/80 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24" data-testid="orga-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Technologie</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              Une technologie puissante, une simplicite enfantine
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              Fini la complexite. Creez un parcours d inscription sur-mesure qui se plie a vos regles, sans contraintes techniques.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                className="p-6 border border-slate-200 hover:border-brand group transition-all"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
              >
                <f.icon className="w-10 h-10 text-brand mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Checklist */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Tout inclus</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
                Tout ce dont vous avez besoin, et plus encore
              </h2>
              <p className="text-slate-500 mt-4 leading-relaxed">
                SportLyo reunit tous les outils necessaires pour gerer votre evenement de A a Z. Plus besoin de jongler entre plusieurs logiciels.
              </p>
              <div className="mt-8">
                <Link to="/register">
                  <Button className="btn-primary gap-2" data-testid="orga-cta-advantages">
                    Commencer gratuitement <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {advantages.map((a, idx) => (
                <motion.div
                  key={a}
                  className="flex items-center gap-2 p-3 bg-white border border-slate-200"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  viewport={{ once: true }}
                >
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                  <span className="text-sm font-medium">{a}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sports */}
      <section className="py-24" data-testid="orga-sports">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Multisport</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              Un seul outil, une multitude de terrains de jeu
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              Que vous geriez 50 passionnes ou 15 000 competiteurs, notre plateforme s adapte a la realite de votre discipline.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {sports.map((s, idx) => (
              <motion.div
                key={s.name}
                className="p-5 border border-slate-200 text-center hover:border-brand group transition-all"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ y: -3 }}
              >
                <s.icon className="w-8 h-8 mx-auto mb-2 text-brand group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-[10px]">{s.name}</h3>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            Votre format est hors-categorie ? Contactez-nous, on adore relever de nouveaux defis.
          </p>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-24 bg-asphalt text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Ecosysteme</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
              Connecte a votre ecosysteme habituel
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                num: '01',
                title: 'L allie des Chronometreurs',
                desc: 'Compatible avec tous les systemes du marche (RaceResult, MyLaps, etc.). API ouverte avec guide d integration et snippets de code prets a l emploi.'
              },
              {
                num: '02',
                title: 'Billets digitaux personnalises',
                desc: 'QR codes uniques, dossards automatiques, informations de course. Vos billets a vos couleurs, directement dans le dashboard participant.'
              },
              {
                num: '03',
                title: 'Boutique integree, zero stock',
                desc: 'Proposez T-shirts, gourdes et accessoires personnalises a vos participants. Nos prestataires gerent le stock et la logistique, vous touchez une commission sur chaque vente.'
              },
              {
                num: '04',
                title: 'Parcours & Altimetrie',
                desc: 'Integration OpenRunner native. Affichez le profil altimetrique et le trace du parcours directement sur votre page evenement.'
              }
            ].map((item, idx) => (
              <motion.div
                key={item.num}
                className="border border-slate-700 p-8"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <span className="text-brand font-heading text-4xl font-bold">{item.num}</span>
                <h3 className="font-heading font-bold text-xl uppercase mt-4 mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">Support</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase mt-2">
                Un support dedie pour vous et vos participants
              </h2>
              <p className="text-slate-500 mt-4 leading-relaxed">
                Le jour J, vous avez autre chose a faire que de repondre a des emails. On s en occupe.
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-6 border border-slate-200 border-l-4 border-l-brand">
                <h3 className="font-heading font-bold uppercase tracking-wider mb-2">Pour l Organisateur</h3>
                <p className="text-slate-500 text-sm">Dashboard centralise avec toutes les informations. Gestion des inscrits, export des donnees, suivi des paiements en temps reel.</p>
              </div>
              <div className="p-6 border border-slate-200 border-l-4 border-l-brand">
                <h3 className="font-heading font-bold uppercase tracking-wider mb-2">Pour les Participants</h3>
                <p className="text-slate-500 text-sm">Espace personnel avec billet digital, QR code, informations de course et suivi PPS. Inscription rapide et pre-remplissage des donnees.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            className="font-heading text-3xl md:text-5xl font-bold uppercase"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Pret a lancer votre prochaine edition ?
          </motion.h2>
          <motion.p
            className="text-lg text-white/80 mt-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
          >
            Rejoignez SportLyo et gerez vos inscriptions en toute simplicite.
          </motion.p>
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Link to="/register">
              <Button className="bg-white text-brand hover:bg-slate-100 h-14 px-8 text-base font-heading font-bold uppercase tracking-wider gap-2" data-testid="orga-cta-final">
                Creer mon evenement gratuitement <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-white/60 mt-4">Configuration en 5 minutes. Sans engagement.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default OrgaLandingPage;
