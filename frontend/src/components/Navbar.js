import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, User, LogOut, LayoutDashboard, Calendar, ChevronDown,
  Ticket, Settings, ShieldCheck, BarChart3, QrCode, Trophy,
  CreditCard, UserCircle, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

const roleConfig = {
  admin: {
    label: 'Administrateur',
    color: 'bg-red-500',
    items: [
      { icon: ShieldCheck, label: 'Administration', to: '/admin', testId: 'dashboard-link' },
      { icon: BarChart3, label: 'Finances', to: '/admin', testId: 'admin-finances-link' },
    ]
  },
  organizer: {
    label: 'Organisateur',
    color: 'bg-brand',
    items: [
      { icon: LayoutDashboard, label: 'Tableau de bord', to: '/organizer', testId: 'dashboard-link' },
      { icon: Calendar, label: 'Mes événements', to: '/organizer', testId: 'my-events-link' },
      { icon: QrCode, label: 'Check-in', to: '/organizer', testId: 'checkin-link' },
    ]
  },
  participant: {
    label: 'Participant',
    color: 'bg-sky-500',
    items: [
      { icon: UserCircle, label: 'Mon espace', to: '/dashboard', testId: 'dashboard-link' },
      { icon: Ticket, label: 'Mes inscriptions', to: '/dashboard/registrations', testId: 'my-registrations-link' },
    ]
  }
};

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'organizer': return '/organizer';
      default: return '/dashboard';
    }
  };

  const role = user?.role || 'participant';
  const config = roleConfig[role] || roleConfig.participant;

  const navLinks = [
    { label: 'Événements', href: '/events' },
    { label: 'Organisateurs', href: '/organizers' },
  ];

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <img src="/logo-dark.png" alt="SportLyo" className="h-10" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`nav-link ${location.pathname === link.href ? 'text-brand' : ''}`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand/50 hover:bg-slate-50 transition-all"
                  data-testid="user-menu-trigger"
                >
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-brand/20" />
                  ) : (
                    <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="font-heading font-bold text-sm uppercase tracking-wider max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <motion.div animate={{ rotate: isMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl overflow-hidden z-50"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      data-testid="user-dropdown-menu"
                    >
                      {/* Profile Header */}
                      <div className="p-4 bg-asphalt text-white">
                        <div className="flex items-center gap-3">
                          {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="w-11 h-11 rounded-full ring-2 ring-white/20" />
                          ) : (
                            <div className={`w-11 h-11 ${config.color} rounded-full flex items-center justify-center`}>
                              <span className="text-white text-lg font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-bold text-sm uppercase tracking-wider truncate">{user?.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                          </div>
                        </div>
                        <span className={`inline-block mt-3 px-2.5 py-0.5 text-[10px] font-heading font-bold uppercase tracking-widest ${config.color} text-white`}>
                          {config.label}
                        </span>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {config.items.map((item, idx) => (
                          <motion.button
                            key={item.testId}
                            onClick={() => { navigate(item.to); setIsMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 group transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.04 }}
                            data-testid={item.testId}
                          >
                            <div className="w-9 h-9 bg-slate-100 group-hover:bg-brand/10 flex items-center justify-center transition-colors">
                              <item.icon className="w-4.5 h-4.5 text-slate-500 group-hover:text-brand transition-colors" />
                            </div>
                            <span className="font-heading font-bold text-sm uppercase tracking-wider flex-1">{item.label}</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                          </motion.button>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-slate-100">
                        <motion.button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 group transition-colors"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15, delay: config.items.length * 0.04 }}
                          data-testid="logout-btn"
                        >
                          <div className="w-9 h-9 bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                            <LogOut className="w-4.5 h-4.5 text-red-500 transition-colors" />
                          </div>
                          <span className="font-heading font-bold text-sm uppercase tracking-wider text-red-500">Déconnexion</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="font-heading font-bold text-sm uppercase tracking-wider hover:text-brand transition-colors"
                  data-testid="login-btn"
                >
                  Connexion
                </Button>
                <Button
                  className="bg-brand hover:bg-brand/90 text-white font-heading font-bold text-sm uppercase tracking-wider px-6"
                  onClick={() => navigate('/register')}
                  data-testid="register-btn"
                >
                  Inscription
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden py-4 border-t overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              data-testid="mobile-menu"
            >
              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="nav-link py-3 px-2 hover:bg-slate-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {isAuthenticated ? (
                  <div className="pt-3 mt-2 border-t space-y-1">
                    {/* Mobile profile header */}
                    <div className="flex items-center gap-3 px-2 py-3">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className={`w-10 h-10 ${config.color} rounded-full flex items-center justify-center`}>
                          <span className="text-white text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-heading font-bold text-sm uppercase tracking-wider">{user?.name}</p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-heading font-bold uppercase tracking-widest ${config.color} text-white mt-1`}>
                          {config.label}
                        </span>
                      </div>
                    </div>

                    {config.items.map((item) => (
                      <Link
                        key={item.testId}
                        to={item.to}
                        className="flex items-center gap-3 px-2 py-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className="w-5 h-5 text-slate-500" />
                        <span className="font-heading font-bold text-sm uppercase tracking-wider">{item.label}</span>
                      </Link>
                    ))}
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-2 py-3 text-red-500 hover:bg-red-50 transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-heading font-bold text-sm uppercase tracking-wider">Déconnexion</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2 pt-3 mt-2 border-t">
                    <Button variant="outline" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                      Connexion
                    </Button>
                    <Button className="btn-primary" onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}>
                      Inscription
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
