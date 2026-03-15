import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, ArrowRight, ChevronRight, Bike, Footprints, Medal, Car, Moon, Heart, Mountain, Zap, Route as RouteIcon, Timer, Target, Wind, Flag, CircleDot, Dumbbell, Swords, Users, Repeat, Flame, Snowflake, Waves, Music, Compass, Sun, Sparkles, Shield, ArrowUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import EventCard from '../components/EventCard';
import PlatformSlideshow from '../components/PlatformSlideshow';
import { eventsApi, categoriesApi } from '../services/api';

const sportIcons = {
  cycling: Bike,
  running: Footprints,
  triathlon: Medal,
  walking: Footprints,
  motorsport: Car,
  rallye: Car,
  vtt: Mountain,
  bmx: Bike,
  cyclocross: Bike,
  racquet: Target,
  archery: Target,
  kitesurf: Wind,
  golf: Flag,
  petanque: CircleDot,
  billard: CircleDot,
  bowling: CircleDot,
  crossfit: Dumbbell,
  combat: Swords
};

const heroImages = [
  'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=1200&q=75',
  'https://images.unsplash.com/photo-1753516264455-f7678cb97b7a?w=1200&q=75',
  'https://images.unsplash.com/photo-1747072860311-41889d65570c?w=1200&q=75'
];

const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          eventsApi.getFeatured(),
          categoriesApi.getAll()
        ]);
        setFeaturedEvents(eventsRes.data.events);
        setCategories(categoriesRes.data.categories);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Hero image rotation
    const interval = setInterval(() => {
      setCurrentHeroImage(prev => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/events?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        {heroImages.map((img, idx) => (
          <motion.img
            key={idx}
            src={img}
            alt="Hero background"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: currentHeroImage === idx ? 1 : 0 }}
            transition={{ duration: 1 }}
          />
        ))}
        <div className="hero-overlay" />
        
        <div className="hero-content px-4 max-w-4xl mx-auto">
          <motion.h1
            className="font-heading text-5xl md:text-7xl font-extrabold tracking-tight uppercase italic mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Trouvez votre<br />
            <span className="text-brand">prochain défi</span>
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Inscrivez-vous aux meilleurs événements sportifs. 
            Marathons, trails, courses cyclistes et plus encore.
          </motion.p>

          {/* Search Form */}
          <motion.form
            onSubmit={handleSearch}
            className="glass-panel p-4 rounded-sm max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un événement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="hero-search-input"
                />
              </div>
              <Button type="submit" className="btn-primary h-12" data-testid="hero-search-btn">
                Rechercher
              </Button>
            </div>
          </motion.form>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Categories Section */}
      <section className="section-padding bg-slate-50" data-testid="categories-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
                Catégories
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-2">
                Explorez par sport
              </h2>
            </div>
            <Link to="/events" className="hidden md:flex items-center space-x-2 text-brand font-bold uppercase tracking-wider hover:underline">
              <span>Tous les événements</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category, idx) => {
              const IconComponent = sportIcons[category.id] || Footprints;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to={`/events?sport_type=${category.id}`}
                    className="category-card block p-6 bg-white border border-slate-200 text-center hover:border-brand transition-all group"
                    data-testid={`category-${category.id}`}
                  >
                    <IconComponent className="category-icon w-12 h-12 mx-auto mb-4 text-brand group-hover:text-white transition-colors" />
                    <h3 className="font-heading font-bold uppercase tracking-wider text-sm mb-1">
                      {category.name}
                    </h3>
                    <p className="text-xs text-slate-500 group-hover:text-white/80 transition-colors">
                      {category.count} événements
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Events Section - À la une */}
      <section className="section-padding" data-testid="featured-events-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
                A la une
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-2">
                Evenements populaires
              </h2>
            </div>
            <Link to="/events" className="hidden md:flex items-center space-x-2 text-brand font-bold uppercase tracking-wider hover:underline">
              <span>Voir tous</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="loader" />
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event, idx) => (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">Aucun evenement disponible pour le moment.</p>
              <Link to="/events" className="text-brand font-bold mt-4 inline-block hover:underline">
                Explorer tous les evenements
              </Link>
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link to="/events">
              <Button className="btn-secondary">
                Voir tous les evenements
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Slideshow */}
      <PlatformSlideshow />

      {/* SportLyo est partout - Destinations Section */}
      <section className="relative overflow-hidden" data-testid="destinations-section">
        {/* Background */}
        <div className="absolute inset-0 bg-asphalt" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
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
              SportLyo est partout !
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-3 text-white">
              Les destinations a l'honneur
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              SportLyo vous permet de voyager grace a votre passion dans les regions et villes qui font la beaute de notre pays. Explorez les territoires ou il fait bon courir !
            </p>
          </motion.div>

          {/* Destinations Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Lyon', region: 'Auvergne-Rhone-Alpes', events: 12, img: 'https://images.unsplash.com/photo-1624540634628-de5f988c8cdb?w=400&q=80' },
              { name: 'Marseille', region: 'Provence-Alpes-Cote d\'Azur', events: 8, img: 'https://images.unsplash.com/photo-1767717746224-c57f85738584?w=400&q=80' },
              { name: 'Ajaccio', region: 'Corse', events: 3, img: 'https://images.unsplash.com/photo-1662400089180-fca83cc9be9a?w=400&q=80' },
              { name: 'Annecy', region: 'Haute-Savoie', events: 4, img: 'https://images.unsplash.com/photo-1720538907730-b1e2da51438d?w=400&q=80' },
              { name: 'Bordeaux', region: 'Nouvelle-Aquitaine', events: 3, img: 'https://images.unsplash.com/photo-1729166576437-c162a2152f4d?w=400&q=80' },
              { name: 'Paris', region: 'Ile-de-France', events: 6, img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
            ].map((dest, idx) => (
              <motion.div
                key={dest.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/events?location=${encodeURIComponent(dest.name)}`}
                  className="group relative block aspect-square overflow-hidden"
                  data-testid={`dest-${dest.name.toLowerCase()}`}
                >
                  <img
                    src={dest.img}
                    alt={dest.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-brand/80 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-heading font-bold text-white text-lg uppercase tracking-wider">{dest.name}</h3>
                    <p className="text-white/60 text-[10px] font-heading uppercase tracking-wider mt-0.5">{dest.region}</p>
                    <span className="inline-block mt-2 text-[10px] font-heading font-bold text-brand bg-white/90 px-2 py-0.5 uppercase tracking-wider">
                      {dest.events} evenements
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/events">
              <Button className="bg-transparent border-2 border-white/30 text-white hover:bg-white hover:text-asphalt font-heading font-bold uppercase tracking-wider px-8 h-12 transition-all duration-300">
                Toutes les destinations <MapPin className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Défis Sportifs Section */}
      <section className="section-padding" data-testid="themes-section">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
              Défis sportifs
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-2">
              Trouvez votre défi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Running */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-brand text-white">
                <Footprints className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Running</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Marathon', icon: Footprints, color: 'text-brand' },
                  { id: 'Trail', icon: Mountain, color: 'text-emerald-600' },
                  { id: 'Ultra-trail', icon: RouteIcon, color: 'text-violet-600' },
                  { id: 'Course nocturne', icon: Moon, color: 'text-indigo-600' },
                  { id: "Course d'obstacles", icon: Zap, color: 'text-amber-600' },
                  { id: 'Course en montagne', icon: Mountain, color: 'text-emerald-700' },
                  { id: 'Course de nuit en trail', icon: Moon, color: 'text-slate-600' },
                  { id: 'Course sur sable / beach run', icon: Sun, color: 'text-yellow-600' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Autres défis course à pied */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-amber-500 text-white">
                <Users className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Autres défis course</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Course en relais', icon: Users, color: 'text-sky-600' },
                  { id: 'Ekiden', icon: Repeat, color: 'text-teal-600' },
                  { id: 'Backyard ultra', icon: Repeat, color: 'text-violet-600' },
                  { id: 'Course en escaliers', icon: ArrowUp, color: 'text-slate-600' },
                  { id: 'Course déguisée', icon: Sparkles, color: 'text-pink-600' },
                  { id: 'Course parents-enfants', icon: Heart, color: 'text-rose-500' },
                  { id: 'Canicross', icon: Heart, color: 'text-amber-600' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Multisport & Fun */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-pink-500 text-white">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Multisport & Fun</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Run & Bike', icon: Bike, color: 'text-brand' },
                  { id: 'Bike & Run', icon: Footprints, color: 'text-emerald-600' },
                  { id: 'Trail + dégustation', icon: Mountain, color: 'text-amber-700' },
                  { id: 'Course + concert / festival', icon: Music, color: 'text-purple-600' },
                  { id: 'Course en costume / fun run', icon: Sparkles, color: 'text-pink-500' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Défis hivernaux & extrêmes */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-cyan-500 text-white">
                <Snowflake className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Hivernaux & Extrêmes</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Course en raquettes', icon: Snowflake, color: 'text-cyan-600' },
                  { id: 'Course sur glace', icon: Snowflake, color: 'text-blue-500' },
                  { id: 'Ice swim challenge', icon: Waves, color: 'text-sky-600' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Obstacles & Fitness */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-rose-500 text-white">
                <Dumbbell className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Obstacles & Fitness</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Parcours ninja', icon: Swords, color: 'text-red-600' },
                  { id: 'Bootcamp race', icon: Shield, color: 'text-slate-700' },
                  { id: 'Course militaire / commando', icon: Shield, color: 'text-green-700' },
                  { id: 'Challenge fonctionnel', icon: Dumbbell, color: 'text-rose-600' },
                  { id: 'Défi 24h fitness', icon: Timer, color: 'text-amber-600' },
                  { id: 'CrossFit', icon: Dumbbell, color: 'text-rose-500' },
                  { id: 'Hyrox', icon: Flame, color: 'text-orange-600' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Défis Vélo */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500 text-white">
                <Bike className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Défis Vélo</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Cyclosportive', icon: Bike, color: 'text-emerald-600' },
                  { id: 'VTT', icon: Mountain, color: 'text-lime-600' },
                  { id: 'Granfondo', icon: Bike, color: 'text-emerald-700' },
                  { id: 'Randonnée cycliste', icon: Bike, color: 'text-teal-600' },
                  { id: 'Course gravel', icon: Mountain, color: 'text-stone-600' },
                  { id: 'Enduro VTT', icon: Mountain, color: 'text-green-700' },
                  { id: 'Ultra-cyclisme', icon: Bike, color: 'text-emerald-800' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Endurance Outdoor */}
            <motion.div
              className="border border-slate-200 overflow-hidden hover:border-brand/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }} viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-sky-500 text-white">
                <Compass className="w-5 h-5" />
                <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Endurance Outdoor</h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'Triathlon', icon: Medal, color: 'text-sky-600' },
                  { id: 'Raid aventure', icon: Compass, color: 'text-cyan-600' },
                  { id: 'Raid multisports', icon: Mountain, color: 'text-teal-600' },
                  { id: 'Trail orientation', icon: Compass, color: 'text-emerald-600' },
                  { id: 'Marche nordique chronométrée', icon: Footprints, color: 'text-sky-700' },
                  { id: 'Randonnée chronométrée', icon: Timer, color: 'text-amber-600' },
                  { id: 'Swimrun', icon: Waves, color: 'text-blue-600' },
                ].map((item) => (
                  <Link key={item.id} to={`/events?search=${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-2 p-2 hover:bg-asphalt/[0.05] transition-all duration-200 group" data-testid={`theme-${item.id}`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color} group-hover:text-brand transition-colors duration-200`} />
                    <span className="font-heading font-bold uppercase tracking-wider text-[10px] leading-tight group-hover:text-asphalt transition-colors duration-200">{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* CTA Organisateur */}
            <motion.div
              className="relative overflow-hidden flex flex-col items-center justify-center text-center p-8 group cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.35, type: 'spring', stiffness: 120 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              style={{ minHeight: '100%' }}
            >
              {/* Animated background images (same as hero) */}
              {heroImages.map((img, idx) => (
                <motion.img
                  key={idx}
                  src={img}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: currentHeroImage === idx ? 1 : 0 }}
                  transition={{ duration: 1.5 }}
                />
              ))}
              {/* Dark overlay - transitions to orange on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-asphalt via-asphalt/85 to-asphalt/70 z-[1] transition-opacity duration-500 group-hover:opacity-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/85 to-brand/70 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              {/* Brand accent line - grows on hover */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand z-[3] transition-all duration-500 group-hover:h-2" />
              {/* Animated circles overlay - become brighter on hover */}
              <div className="absolute inset-0 z-[2] opacity-15 group-hover:opacity-30 transition-opacity duration-500">
                <motion.div
                  className="absolute -top-10 -right-10 w-40 h-40 border-[3px] border-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute -bottom-8 -left-8 w-32 h-32 border-[3px] border-white rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border border-white/40 rounded-full"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Zap className="w-10 h-10 text-brand group-hover:text-white mx-auto mb-4 transition-colors duration-500" />
                  <h3 className="font-heading text-xl md:text-2xl font-bold uppercase text-white leading-tight mb-2">
                    Votre défi n'est pas dans la liste ?
                  </h3>
                  <p className="text-white/80 group-hover:text-white text-sm mb-6 max-w-xs mx-auto transition-colors duration-500">
                    Il est peut-être temps de le créer.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.65 }}
                  viewport={{ once: true }}
                >
                  <Link to="/organizers">
                    <Button
                      className="bg-white text-brand hover:bg-slate-100 font-heading font-bold uppercase tracking-wider px-6 h-12 text-sm gap-2 transition-all hover:shadow-lg hover:shadow-white/20"
                      data-testid="cta-devenez-organisateur"
                    >
                      Devenez organisateur <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-asphalt text-white py-24" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
              Organisateurs
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-4 mb-6">
              Créez votre événement
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
              Rejoignez SportLyo et gérez vos inscriptions en toute simplicité. 
              Paiement sécurisé, numéros d'inscrit automatiques et statistiques en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="btn-primary">
                  Devenir organisateur
                </Button>
              </Link>
              <Link to="/organizers">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-asphalt">
                  En savoir plus
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-slate-50" data-testid="stats-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Événements' },
              { value: '50K+', label: 'Participants' },
              { value: '100+', label: 'Organisateurs' },
              { value: '5', label: 'Sports' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="font-heading text-5xl md:text-6xl font-extrabold text-brand">
                  {stat.value}
                </div>
                <div className="font-heading uppercase tracking-wider text-sm text-slate-500 mt-2">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
