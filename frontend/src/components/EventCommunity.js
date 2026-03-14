import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Send, Heart, Pin, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

const EventCommunity = ({ eventId }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyText, setReplyText] = useState({});

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}/community`);
      setPosts(res.data.posts || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    if (!user) { toast.error('Connectez-vous pour participer'); return; }
    try {
      const res = await api.post(`/events/${eventId}/community`, { content: newPost });
      setPosts(prev => [res.data.post, ...prev]);
      setNewPost('');
      toast.success('Message publie');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleLike = async (postId) => {
    if (!user) { toast.error('Connectez-vous pour liker'); return; }
    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, likes: p.likes + (res.data.liked ? 1 : -1), liked_by: res.data.liked ? [...(p.liked_by || []), user.user_id] : (p.liked_by || []).filter(id => id !== user.user_id) } : p));
    } catch { /* ignore */ }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.post_id !== postId));
      toast.success('Supprime');
    } catch { toast.error('Erreur'); }
  };

  const handlePin = async (postId) => {
    try {
      const res = await api.put(`/community/posts/${postId}/pin`);
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, pinned: res.data.pinned } : p));
    } catch { toast.error('Erreur'); }
  };

  const loadReplies = async (postId) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    try {
      const res = await api.get(`/community/posts/${postId}/replies`);
      setReplies(prev => ({ ...prev, [postId]: res.data.replies || [] }));
      setExpandedPost(postId);
    } catch { /* ignore */ }
  };

  const handleReply = async (postId) => {
    const text = replyText[postId]?.trim();
    if (!text || !user) return;
    try {
      const res = await api.post(`/community/posts/${postId}/replies`, { content: text });
      setReplies(prev => ({ ...prev, [postId]: [...(prev[postId] || []), res.data.reply] }));
      setReplyText(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const canModerate = user && (user.role === 'admin' || user.role === 'organizer');

  if (loading) return <div className="p-8 text-center text-slate-400">Chargement...</div>;

  return (
    <div data-testid="event-community-section">
      <h2 className="font-heading text-lg font-bold uppercase mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand" /> Communaute
      </h2>

      {/* New post */}
      {user ? (
        <div className="bg-white border border-slate-200 p-4 mb-4" data-testid="community-new-post">
          <textarea
            className="w-full border border-slate-200 rounded p-3 text-sm resize-none focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
            rows={3}
            placeholder="Posez une question ou partagez quelque chose avec la communaute..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            maxLength={2000}
            data-testid="community-post-input"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">{newPost.length}/2000</span>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand/90 text-white gap-1 font-heading font-bold text-xs"
              onClick={handlePost}
              disabled={!newPost.trim()}
              data-testid="community-post-submit"
            >
              <Send className="w-3.5 h-3.5" /> Publier
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-4 mb-4 text-center text-sm text-slate-500">
          Connectez-vous pour participer a la discussion
        </div>
      )}

      {/* Posts list */}
      <div className="space-y-3">
        <AnimatePresence>
          {posts.map(post => (
            <motion.div
              key={post.post_id}
              className={`bg-white border ${post.pinned ? 'border-brand/40 bg-orange-50/30' : 'border-slate-200'} overflow-hidden`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              data-testid={`community-post-${post.post_id}`}
            >
              <div className="p-4">
                {/* Author header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${post.is_organizer ? 'bg-brand' : 'bg-slate-600'}`}>
                      {post.author_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-sm">{post.author_name}</span>
                        {post.is_organizer && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-brand text-white rounded">Organisateur</span>
                        )}
                        {post.pinned && (
                          <Pin className="w-3 h-3 text-brand" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {post.created_at && format(new Date(post.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {canModerate && (
                      <button
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-brand transition-colors"
                        onClick={() => handlePin(post.post_id)}
                        title={post.pinned ? 'Desepingler' : 'Epingler'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(user?.user_id === post.author_id || canModerate) && (
                      <button
                        className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => handleDelete(post.post_id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{post.content}</p>

                {/* Engagement bar */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <button
                    className={`flex items-center gap-1 hover:text-red-500 transition-colors ${post.liked_by?.includes(user?.user_id) ? 'text-red-500' : ''}`}
                    onClick={() => handleLike(post.post_id)}
                    data-testid={`like-post-${post.post_id}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${post.liked_by?.includes(user?.user_id) ? 'fill-current' : ''}`} />
                    {post.likes || 0}
                  </button>
                  <button
                    className="flex items-center gap-1 hover:text-brand transition-colors"
                    onClick={() => loadReplies(post.post_id)}
                    data-testid={`toggle-replies-${post.post_id}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.reply_count || 0} reponse{(post.reply_count || 0) > 1 ? 's' : ''}
                    {expandedPost === post.post_id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Replies */}
              {expandedPost === post.post_id && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {(replies[post.post_id] || []).map(reply => (
                    <div key={reply.reply_id} className="px-4 py-3 border-b border-slate-100 last:border-0" data-testid={`reply-${reply.reply_id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${reply.is_organizer ? 'bg-brand' : 'bg-slate-500'}`}>
                          {reply.author_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-heading font-bold text-xs">{reply.author_name}</span>
                        {reply.is_organizer && <span className="px-1 py-0.5 text-[8px] font-bold uppercase bg-brand text-white rounded">Org</span>}
                        <span className="text-[10px] text-slate-400">
                          {reply.created_at && format(new Date(reply.created_at), 'd MMM HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 ml-8">{reply.content}</p>
                    </div>
                  ))}

                  {/* Reply input */}
                  {user && (
                    <div className="p-3 flex gap-2">
                      <input
                        className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand/20 focus:border-brand outline-none"
                        placeholder="Repondre..."
                        value={replyText[post.post_id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleReply(post.post_id)}
                        data-testid={`reply-input-${post.post_id}`}
                      />
                      <Button
                        size="sm"
                        className="bg-brand hover:bg-brand/90 text-white"
                        onClick={() => handleReply(post.post_id)}
                        disabled={!replyText[post.post_id]?.trim()}
                        data-testid={`reply-submit-${post.post_id}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {posts.length === 0 && (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Aucune discussion pour le moment. Soyez le premier a poster !
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCommunity;
