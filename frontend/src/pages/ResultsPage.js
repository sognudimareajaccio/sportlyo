import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, Medal, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../services/api';

const ResultsPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRace, setSelectedRace] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = async () => {
    try {
      const [eventRes, resultsRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/timing/results/${eventId}${selectedRace !== 'all' ? `?race=${selectedRace}` : ''}`)
      ]);
      setEvent(eventRes.data);
      setResults(resultsRes.data.results);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [eventId, selectedRace]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, eventId, selectedRace]);

  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-slate-400';
      case 3: return 'text-amber-600';
      default: return 'text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="results-page">
      {/* Header */}
      <div className="bg-asphalt text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={`/events/${eventId}`} className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour à l'événement
          </Link>
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-brand" />
            <div>
              <h1 className="font-heading text-3xl font-bold uppercase">Résultats Live</h1>
              <p className="text-slate-400">{event?.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-16 z-40 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {event?.races && event.races.length > 0 && (
                <Select value={selectedRace} onValueChange={setSelectedRace}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Toutes les épreuves" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les épreuves</SelectItem>
                    {event.races.map(race => (
                      <SelectItem key={race.name} value={race.name}>{race.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <span className="text-sm text-slate-500">{results.length} résultat(s)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchResults}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualiser
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {results.length > 0 ? (
          <div className="bg-white border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-asphalt text-white">
                <tr>
                  <th className="text-left p-4 font-heading font-bold uppercase text-sm w-20">Rang</th>
                  <th className="text-left p-4 font-heading font-bold uppercase text-sm">Participant</th>
                  <th className="text-left p-4 font-heading font-bold uppercase text-sm">Dossard</th>
                  {event?.races && event.races.length > 1 && (
                    <th className="text-left p-4 font-heading font-bold uppercase text-sm">Épreuve</th>
                  )}
                  <th className="text-right p-4 font-heading font-bold uppercase text-sm">Temps</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <motion.tr
                    key={result.bib_number}
                    className={`border-b hover:bg-slate-50 ${idx < 3 ? 'bg-slate-50' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {result.rank <= 3 && (
                          <Medal className={`w-6 h-6 ${getMedalColor(result.rank)}`} />
                        )}
                        <span className={`font-heading font-bold text-xl ${result.rank <= 3 ? getMedalColor(result.rank) : ''}`}>
                          {result.rank}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{result.user_name}</td>
                    <td className="p-4">
                      <span className="bib-number text-sm py-0.5 px-2">{result.bib_number}</span>
                    </td>
                    {event?.races && event.races.length > 1 && (
                      <td className="p-4 text-slate-500">{result.selected_race || '-'}</td>
                    )}
                    <td className="p-4 text-right">
                      <span className="font-heading text-xl font-bold text-brand">
                        {result.formatted_time}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold mb-2">Aucun résultat</h3>
            <p className="text-slate-500">Les résultats apparaîtront ici dès que les participants auront terminé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
