import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const sportIcons = {
  cycling: '🚴',
  running: '🏃',
  triathlon: '🏊',
  walking: '🚶',
  motorsport: '🏎️'
};

const sportLabels = {
  cycling: 'Cyclisme',
  running: 'Course à pied',
  triathlon: 'Triathlon',
  walking: 'Marche',
  motorsport: 'Sports Mécaniques'
};

const EventCard = ({ event }) => {
  const eventDate = new Date(event.date);
  const spotsLeft = event.max_participants - event.current_participants;

  return (
    <Link
      to={`/events/${event.event_id}`}
      className="event-card card-event group"
      data-testid={`event-card-${event.event_id}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=800'}
          alt={event.title}
          className="event-image w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className="badge badge-brand">
            {sportIcons[event.sport_type]} {sportLabels[event.sport_type]}
          </span>
        </div>
        {spotsLeft <= 10 && spotsLeft > 0 && (
          <div className="absolute top-3 right-3">
            <span className="badge badge-warning">
              {spotsLeft} places restantes
            </span>
          </div>
        )}
        {spotsLeft === 0 && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-red-500 text-white">
              Complet
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Date badge */}
        <div className="flex items-center mb-3">
          <div className="bg-asphalt text-white px-3 py-1 text-center mr-3">
            <div className="font-heading font-bold text-xl leading-none">
              {format(eventDate, 'd')}
            </div>
            <div className="font-heading text-xs uppercase tracking-wider">
              {format(eventDate, 'MMM', { locale: fr })}
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {format(eventDate, 'yyyy')}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading font-bold text-lg text-asphalt group-hover:text-brand transition-colors mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-sm text-slate-500 mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Distances */}
        {event.distances && event.distances.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {event.distances.slice(0, 3).map((distance, idx) => (
              <span key={idx} className="distance-badge">
                {distance}
              </span>
            ))}
            {event.distances.length > 3 && (
              <span className="distance-badge bg-slate-200 text-slate-600">
                +{event.distances.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-500">
            <Users className="w-4 h-4 mr-1" />
            <span>{event.current_participants}/{event.max_participants}</span>
          </div>
          <div className="price-tag">
            À partir de {event.price}€
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
