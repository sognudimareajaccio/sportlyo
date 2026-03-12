import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-asphalt text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-6">
              <img src="/logo-light.png" alt="SportLyo" className="h-10" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              La plateforme de référence pour réserver vos événements sportifs. 
              Marathons, trails, courses cyclistes et plus encore.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-400 hover:text-brand transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-brand transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-brand transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-brand transition-colors" aria-label="Youtube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Sports */}
          <div>
            <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-6">Sports</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/events?sport_type=cycling" className="text-slate-400 hover:text-white transition-colors">
                  Cyclisme
                </Link>
              </li>
              <li>
                <Link to="/events?sport_type=running" className="text-slate-400 hover:text-white transition-colors">
                  Course à pied
                </Link>
              </li>
              <li>
                <Link to="/events?sport_type=triathlon" className="text-slate-400 hover:text-white transition-colors">
                  Triathlon
                </Link>
              </li>
              <li>
                <Link to="/events?sport_type=walking" className="text-slate-400 hover:text-white transition-colors">
                  Marche
                </Link>
              </li>
              <li>
                <Link to="/events?sport_type=motorsport" className="text-slate-400 hover:text-white transition-colors">
                  Sports Mécaniques
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-6">Liens utiles</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/events" className="text-slate-400 hover:text-white transition-colors">
                  Tous les événements
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-400 hover:text-white transition-colors">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="text-slate-400 hover:text-white transition-colors">
                  Espace organisateur
                </Link>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Conditions générales
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Politique de confidentialité
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <span className="text-slate-400 text-sm">
                  123 Avenue du Sport<br />75008 Paris, France
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-brand flex-shrink-0" />
                <span className="text-slate-400 text-sm">+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-brand flex-shrink-0" />
                <span className="text-slate-400 text-sm">contact@sportlyo.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <p className="text-slate-500 text-sm">
                © 2026 SportLyo. Tous droits réservés.
              </p>
              {/* Discreet admin access - small gear icon */}
              <Link 
                to="/admin" 
                className="text-slate-600 hover:text-brand transition-colors opacity-40 hover:opacity-100"
                title="Administration"
                data-testid="admin-link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </Link>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <span className="text-slate-500">Paiement sécurisé par</span>
              <span className="font-heading font-bold text-brand">STRIPE</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
