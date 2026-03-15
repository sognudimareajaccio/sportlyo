import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Square, Clock, Trophy, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

const TimerPage = () => {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetchRegistration = async () => {
      try {
        const res = await api.get(`/registrations/${registrationId}`);
        setRegistration(res.data);
        
        // If race already started, calculate elapsed time
        if (res.data.race_started && res.data.race_start_time && !res.data.race_finished) {
          const startTime = new Date(res.data.race_start_time);
          const now = new Date();
          const elapsed = Math.floor((now - startTime) / 1000);
          setElapsedTime(elapsed);
          setIsRunning(true);
        } else if (res.data.race_finished && res.data.race_duration_seconds) {
          setElapsedTime(res.data.race_duration_seconds);
        }
      } catch (error) {
        toast.error('Inscription non trouvée');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchRegistration();
  }, [registrationId, navigate]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isRunning && registration && !registration.race_finished) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, registration]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await api.post('/timing/start', { registration_id: registrationId });
      setIsRunning(true);
      setRegistration(prev => ({ ...prev, race_started: true, race_start_time: new Date().toISOString() }));
      toast.success('Chrono démarré !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleStop = async () => {
    try {
      const res = await api.post('/timing/stop', { registration_id: registrationId });
      setIsRunning(false);
      setRegistration(prev => ({ 
        ...prev, 
        race_finished: true, 
        race_duration_seconds: res.data.duration_seconds 
      }));
      toast.success(`Temps final: ${res.data.formatted_time}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-asphalt">
        <div className="loader" />
      </div>
    );
  }

  if (!registration) return null;

  return (
    <div className="min-h-screen bg-asphalt text-white flex flex-col" data-testid="timer-page">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <Link to="/dashboard/registrations" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour
        </Link>
        <h1 className="font-heading text-2xl font-bold uppercase">{registration.event?.title}</h1>
        <p className="text-slate-400">N° d'inscrit: <span className="text-brand font-bold">{registration.bib_number}</span></p>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          className={`text-8xl md:text-9xl font-heading font-extrabold tracking-tight ${isRunning ? 'text-brand' : 'text-white'}`}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {formatTime(elapsedTime)}
        </motion.div>

        {registration.race_finished && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-xl text-slate-300">Course terminée !</p>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 space-y-4">
        {!registration.race_started && !registration.race_finished && (
          <Button
            onClick={handleStart}
            className="w-full h-20 text-2xl bg-green-600 hover:bg-green-700 font-heading uppercase"
            data-testid="start-timer-btn"
          >
            <Play className="w-8 h-8 mr-3" />
            Démarrer
          </Button>
        )}

        {registration.race_started && !registration.race_finished && (
          <Button
            onClick={handleStop}
            className="w-full h-20 text-2xl bg-red-600 hover:bg-red-700 font-heading uppercase"
            data-testid="stop-timer-btn"
          >
            <Square className="w-8 h-8 mr-3" />
            Arrivée
          </Button>
        )}

        {registration.race_finished && (
          <Link to={`/results/${registration.event_id}`}>
            <Button className="w-full h-16 text-xl btn-primary font-heading uppercase">
              <Trophy className="w-6 h-6 mr-2" />
              Voir le classement
            </Button>
          </Link>
        )}
      </div>

      {/* Info */}
      <div className="p-6 bg-slate-800/50 text-center">
        <p className="text-sm text-slate-400">
          {registration.selected_race && `Épreuve: ${registration.selected_race}`}
        </p>
      </div>
    </div>
  );
};

export default TimerPage;
