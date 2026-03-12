import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, ArrowRight, ChevronRight, Bike, Footprints, Medal, Car, Moon, Heart, Mountain, Zap, Route as RouteIcon, Timer } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import EventCard from '../components/EventCard';
import { eventsApi, categoriesApi } from '../services/api';

const sportIcons = {
  cycling: Bike,
  running: Footprints,
  triathlon: Medal,
  walking: Footprints,
  motorsport: Car
};

const heroImages = [
  'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=1920',
  'https://images.unsplash.com/photo-1753516264455-f7678cb97b7a?w=1920',
  'https://images.unsplash.com/photo-1747072860311-41889d65570c?w=1920'
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
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

      {/* Themes Section */}
      <section className="section-padding" data-testid="themes-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
                Thématiques
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-2">
                Trouvez votre défi
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: 'Trail', icon: Mountain, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-600' },
              { id: 'Marathon', icon: Footprints, color: 'text-brand', bg: 'bg-orange-50 hover:bg-brand' },
              { id: 'Course nocturne', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-600' },
              { id: 'Course caritative', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50 hover:bg-pink-600' },
              { id: 'Course d\'obstacles', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-600' },
              { id: 'Ultra-trail', icon: RouteIcon, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-600' },
            ].map((theme, idx) => (
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/events?theme=${encodeURIComponent(theme.id)}`}
                  className={`block p-5 border border-slate-200 text-center group transition-all ${theme.bg} hover:border-transparent hover:text-white`}
                  data-testid={`theme-${theme.id}`}
                >
                  <theme.icon className={`w-10 h-10 mx-auto mb-3 ${theme.color} group-hover:text-white transition-colors`} />
                  <h3 className="font-heading font-bold uppercase tracking-wider text-xs">
                    {theme.id}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="section-padding" data-testid="featured-events-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
                À la une
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase mt-2">
                Événements populaires
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
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">Aucun événement disponible pour le moment.</p>
              <Link to="/events" className="text-brand font-bold mt-4 inline-block hover:underline">
                Explorer tous les événements
              </Link>
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link to="/events">
              <Button className="btn-secondary">
                Voir tous les événements
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
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
              Paiement sécurisé, numéros de dossard automatiques et statistiques en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="btn-primary">
                  Devenir organisateur
                </Button>
              </Link>
              <Link to="/events">
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
