import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Radio, Plus, ShoppingCart, Trash2, Calendar, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RfidRentalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [cart, setCart] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eqRes, rentRes] = await Promise.all([
          api.get('/rfid/equipment'),
          api.get('/rfid/rentals/my')
        ]);
        setEquipment(eqRes.data.equipment || []);
        setMyRentals(rentRes.data.rentals || []);
      } catch { /* ignore */ }
      try {
        const evRes = await api.get('/organizer/events');
        setEvents(evRes.data.events || []);
      } catch { /* ignore */ }
    };
    if (user) fetchData();
  }, [user]);

  const addToCart = (equip) => {
    const existing = cart.find(c => c.equipment_id === equip.equipment_id);
    if (existing) {
      setCart(prev => prev.map(c => c.equipment_id === equip.equipment_id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart(prev => [...prev, { ...equip, quantity: 1, days: 3 }]);
    }
    toast.success(`${equip.name} ajoute`);
  };

  const removeFromCart = (eqId) => setCart(prev => prev.filter(c => c.equipment_id !== eqId));

  const cartTotal = cart.reduce((s, c) => s + c.daily_rate * c.quantity * c.days, 0);

  const handleSubmitRental = async () => {
    if (!selectedEvent) { toast.error('Selectionnez un evenement'); return; }
    if (cart.length === 0) { toast.error('Panier vide'); return; }
    try {
      const res = await api.post('/rfid/rentals', {
        event_id: selectedEvent,
        items: cart.map(c => ({ equipment_id: c.equipment_id, quantity: c.quantity, days: c.days })),
        start_date: startDate,
        end_date: endDate
      });
      toast.success('Demande de location envoyee');
      setMyRentals(prev => [res.data.rental, ...prev]);
      setCart([]);
      setShowCart(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  if (!user || !['organizer', 'admin'].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Acces reserve aux organisateurs</p></div>;
  }

  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', returned: 'bg-slate-100 text-slate-700' };
  const statusLabels = { pending: 'En attente', confirmed: 'Confirmee', rejected: 'Refusee', returned: 'Retournee' };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-asphalt text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <Radio className="w-5 h-5 text-brand" />
          <h1 className="font-heading font-bold text-lg">Location Materiel RFID</h1>
        </div>
        <Button size="sm" variant="outline" className="border-white text-white gap-1 relative" onClick={() => setShowCart(!showCart)} data-testid="rfid-cart-btn">
          <ShoppingCart className="w-4 h-4" />
          {cart.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand text-white text-[10px] rounded-full flex items-center justify-center">{cart.length}</span>}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Equipment catalog */}
        <div data-testid="rfid-catalog">
          <h2 className="font-heading font-bold uppercase text-sm text-slate-600 mb-3">Catalogue materiel</h2>
          {equipment.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map(eq => (
                <motion.div key={eq.equipment_id} className="bg-white border border-slate-200 p-4 hover:shadow-md transition-shadow" whileHover={{ y: -2 }} data-testid={`rfid-item-${eq.equipment_id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-heading font-bold text-sm">{eq.name}</p>
                      <p className="text-xs text-slate-500">{eq.category}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-bold">{eq.daily_rate}€/jour</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{eq.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{eq.quantity_available} dispo.</span>
                    <Button size="sm" className="bg-brand text-white text-xs gap-1" onClick={() => addToCart(eq)} data-testid={`rfid-add-${eq.equipment_id}`}>
                      <Plus className="w-3 h-3" /> Ajouter
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-8 text-center text-slate-400">Aucun equipement disponible</div>
          )}
        </div>

        {/* Cart panel */}
        {showCart && (
          <motion.div className="bg-white border-2 border-brand p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid="rfid-cart">
            <h3 className="font-heading font-bold uppercase text-sm mb-3">Panier de location</h3>
            {cart.length > 0 ? (
              <>
                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.equipment_id} className="flex items-center justify-between bg-slate-50 p-2">
                      <div className="flex items-center gap-3">
                        <p className="font-heading font-bold text-sm">{item.name}</p>
                        <div className="flex items-center gap-1">
                          <Input type="number" min={1} className="w-14 h-7 text-xs text-center" value={item.quantity}
                            onChange={(e) => setCart(prev => prev.map(c => c.equipment_id === item.equipment_id ? { ...c, quantity: parseInt(e.target.value) || 1 } : c))} />
                          <span className="text-[10px] text-slate-400">x</span>
                          <Input type="number" min={1} className="w-14 h-7 text-xs text-center" value={item.days}
                            onChange={(e) => setCart(prev => prev.map(c => c.equipment_id === item.equipment_id ? { ...c, days: parseInt(e.target.value) || 1 } : c))} />
                          <span className="text-[10px] text-slate-400">jours</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm">{(item.daily_rate * item.quantity * item.days).toFixed(2)}€</span>
                        <button onClick={() => removeFromCart(item.equipment_id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <select className="border border-slate-200 rounded p-2 text-sm" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} data-testid="rfid-event-select">
                    <option value="">Evenement...</option>
                    {events.map(e => <option key={e.event_id} value={e.event_id}>{e.title}</option>)}
                  </select>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" data-testid="rfid-start-date" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" data-testid="rfid-end-date" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-heading font-bold text-xl">Total: {cartTotal.toFixed(2)}€</p>
                  <Button className="bg-brand text-white gap-1 font-heading font-bold" onClick={handleSubmitRental} data-testid="rfid-submit">
                    <Package className="w-4 h-4" /> Demander la location
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">Panier vide</p>
            )}
          </motion.div>
        )}

        {/* My rentals */}
        {myRentals.length > 0 && (
          <div data-testid="rfid-my-rentals">
            <h2 className="font-heading font-bold uppercase text-sm text-slate-600 mb-3">Mes locations</h2>
            <div className="space-y-3">
              {myRentals.map(r => (
                <div key={r.rental_id} className="bg-white border border-slate-200 p-4" data-testid={`rental-${r.rental_id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-heading font-bold text-sm">{r.event_title}</p>
                      <p className="text-xs text-slate-500">{r.items?.length} article(s) — {r.start_date} au {r.end_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-lg">{r.total?.toFixed(2)}€</p>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[r.status] || 'bg-slate-100'}`}>
                        {statusLabels[r.status] || r.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.items?.map((item, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-xs">{item.name} x{item.quantity} ({item.days}j)</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
