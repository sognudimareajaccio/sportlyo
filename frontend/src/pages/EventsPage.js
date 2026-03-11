import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, Calendar, Grid, List, X } from 'lucide-react';
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
      {/* Header */}
      <div className="bg-asphalt text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase">
              Tous les événements
            </h1>
            <p className="text-slate-400 mt-4 max-w-2xl">
              Découvrez et inscrivez-vous aux meilleurs événements sportifs près de chez vous.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher un événement..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>

            {/* Sport Type Select */}
            <Select
              value={filters.sport_type}
              onValueChange={(value) => handleFilterChange('sport_type', value)}
            >
              <SelectTrigger className="w-full md:w-48" data-testid="sport-filter">
                <SelectValue placeholder="Type de sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sports</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location */}
            <div className="relative w-full md:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Lieu"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-9"
                data-testid="location-input"
              />
            </div>

            {/* View Toggle */}
            <div className="hidden md:flex items-center space-x-2 border rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-100' : ''}`}
                data-testid="view-grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100' : ''}`}
                data-testid="view-list"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-slate-500">Filtres actifs:</span>
              {filters.search && (
                <span className="badge badge-brand flex items-center gap-1">
                  "{filters.search}"
                  <button onClick={() => handleFilterChange('search', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.sport_type && filters.sport_type !== 'all' && (
                <span className="badge badge-brand flex items-center gap-1">
                  {sportLabels[filters.sport_type]}
                  <button onClick={() => handleFilterChange('sport_type', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.location && (
                <span className="badge badge-brand flex items-center gap-1">
                  {filters.location}
                  <button onClick={() => handleFilterChange('location', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-brand hover:underline"
              >
                Effacer tout
              </button>
            </div>
          )}
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
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-heading text-2xl font-bold mb-2">Aucun événement trouvé</h3>
            <p className="text-slate-500 mb-6">
              Essayez de modifier vos critères de recherche ou explorez d'autres catégories.
            </p>
            <Button onClick={clearFilters} className="btn-primary">
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
