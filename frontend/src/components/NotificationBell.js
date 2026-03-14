import React, { useState, useEffect, useCallback } from 'react';
import { Bell, MessageSquare, ShoppingBag, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';

const NotificationBell = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 15000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const handleClick = (notif) => {
    if (!notif.read) {
      api.post('/notifications/read', { notification_ids: [notif.notification_id] });
      setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (onNavigate && notif.type === 'message') onNavigate('messaging');
    if (onNavigate && notif.type === 'order') onNavigate('orders');
    setOpen(false);
  };

  const iconMap = { message: MessageSquare, order: ShoppingBag };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-white/10 transition-colors" data-testid="notification-bell">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse" data-testid="notification-badge">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 shadow-xl z-50 max-h-[400px] flex flex-col" data-testid="notification-panel">
            <div className="flex items-center justify-between p-3 border-b bg-slate-50">
              <h3 className="font-heading font-bold text-xs uppercase text-asphalt">Notifications</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-brand font-bold hover:underline flex items-center gap-1" data-testid="mark-all-read">
                    <Check className="w-3 h-3" /> Tout lire
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? notifications.map(n => {
                const Icon = iconMap[n.type] || Bell;
                return (
                  <button key={n.notification_id} onClick={() => handleClick(n)}
                    className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 flex gap-3 transition-colors ${!n.read ? 'bg-brand/5' : ''}`}
                    data-testid={`notif-${n.notification_id}`}>
                    <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-heading ${!n.read ? 'font-bold text-asphalt' : 'text-slate-500'}`}>{n.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{n.created_at && format(new Date(n.created_at), 'd MMM HH:mm', { locale: fr })}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-brand rounded-full flex-shrink-0 mt-1" />}
                  </button>
                );
              }) : (
                <div className="p-8 text-center text-slate-400 text-xs">Aucune notification</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
