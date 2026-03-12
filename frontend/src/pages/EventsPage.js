import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MapPin, Calendar, Grid, List, X, SlidersHorizontal, Bike, Footprints, Medal, Mountain, Dumbbell, Swords, Car, Wind, Flag, CircleDot, Target } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import EventCard from '../components/EventCard';
import { eventsApi, categoriesApi } from '../services/api';

const sportLabels = {
  cycling: 'Cyclisme',
  running: 'Course à pied',
  triathlon: 'Triathlon',
  walking: 'Marche',
  motorsport: 'Sports Mécaniques'
};

const sportIcons = {
  cycling: Bike, running: Footprints, triathlon: Medal, walking: Footprints,
  motorsport: Car, rallye: Car, vtt: Mountain, bmx: Bike, cyclocross: Bike,
  racquet: Target, archery: Target, kitesurf: Wind, golf: Flag,
  petanque: CircleDot, billard: CircleDot, bowling: CircleDot,
  crossfit: Dumbbell, combat: Swords
};

const EventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sport_type: searchParams.get('sport_type') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page')) || 1
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getAll();
        setCategories(res.data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filters.search) params.search = filters.search;
        if (filters.sport_type) params.sport_type = filters.sport_type;
        if (filters.location) params.location = filters.location;
        params.page = filters.page;

        const res = await eventsApi.getAll(params);
        setEvents(res.data.events);
        setTotalPages(res.data.pages);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();

    // Update URL params
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.sport_type) params.set('sport_type', filters.sport_type);
    if (filters.location) params.set('location', filters.location);
    if (filters.page > 1) params.set('page', filters.page.toString());
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', sport_type: '', location: '', page: 1 });
  };

  const activeFiltersCount = [filters.search, filters.sport_type, filters.location].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="events-page">
      {/* Hero Search */}
      <div className="relative bg-asphalt overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase text-white">
              Tous les événements
            </h1>
            <p className="text-slate-400 mt-3 max-w-xl">
              Découvrez et inscrivez-vous aux meilleurs événements sportifs près de chez vous.
            </p>
          </motion.div>

          {/* Big Search Bar */}
          <motion.div
            className="mt-10 bg-white/10 backdrop-blur-xl border border-white/20 p-2 md:p-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          >
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex flex-col md:flex-row gap-2 md:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un événement, un sport, une ville..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-base outline-none focus:ring-2 focus:ring-brand transition-all"
                  data-testid="search-input"
                />
              </div>
              <div className="relative w-full md:w-56">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
                <input
                  type="text"
                  placeholder="Ville ou région"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-base outline-none focus:ring-2 focus:ring-brand transition-all"
                  data-testid="location-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`hidden md:flex items-center justify-center h-14 w-14 transition-all ${showFilters ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                data-testid="toggle-filters-btn"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </form>
          </motion.div>

          {/* Sport Category Pills */}
          <motion.div
            className="mt-5 flex flex-wrap gap-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}
          >
            <button
              onClick={() => handleFilterChange('sport_type', '')}
              className={`px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                !filters.sport_type ? 'bg-brand text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
              data-testid="filter-all"
            >
              Tous
            </button>
            {categories.map(cat => {
              const Icon = sportIcons[cat.id] || Footprints;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleFilterChange('sport_type', cat.id === filters.sport_type ? '' : cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                    filters.sport_type === cat.id ? 'bg-brand text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
                  }`}
                  data-testid={`filter-${cat.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Active Filters & View Toggle */}
      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              {activeFiltersCount > 0 ? (
                <>
                  <span className="text-sm text-slate-500 hidden sm:inline">Filtres :</span>
                  {filters.search && (
                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      <Search className="w-3 h-3" />
                      {filters.search}
                      <button onClick={() => handleFilterChange('search', '')} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filters.sport_type && filters.sport_type !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      {categories.find(c => c.id === filters.sport_type)?.name || filters.sport_type}
                      <button onClick={() => handleFilterChange('sport_type', '')} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filters.location && (
                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      <MapPin className="w-3 h-3" />
                      {filters.location}
                      <button onClick={() => handleFilterChange('location', '')} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-brand font-bold uppercase tracking-wider underline">
                    Tout effacer
                  </button>
                </>
              ) : (
                <span className="text-sm text-slate-500">
                  {!loading && <>{events.length} événement{events.length > 1 ? 's' : ''}</>}
                </span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-1 border border-slate-200 p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-brand text-white' : 'hover:bg-slate-100'}`} data-testid="view-grid">
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-brand text-white' : 'hover:bg-slate-100'}`} data-testid="view-list">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="loader" />
          </div>
        ) : events.length > 0 ? (
          <>
            <p className="text-slate-500 mb-6">
              {events.length} événement{events.length > 1 ? 's' : ''} trouvé{events.length > 1 ? 's' : ''}
            </p>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'flex flex-col gap-4'
            }>
              {events.map((event, idx) => (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4">
                  Page {filters.page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={filters.page === totalPages}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="font-heading text-2xl font-bold mb-2">Aucun événement trouvé</h3>
            <p className="text-slate-500 mb-6">
              Essayez de modifier vos critères de recherche ou explorez d'autres catégories.
            </p>
            <Button onClick={clearFilters} className="btn-primary">
              Voir tous les événements
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
