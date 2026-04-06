import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  MessageCircle, User, Clock, CheckCircle2, AlertCircle,
  Send, UserCheck, ChevronLeft, Loader2, Star, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminSupportPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Ticket {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string | null;
  status: string;
  mode: string;
  escalated: boolean;
  priority: string;
  assigned_to: string | null;
  csat_score: number | null;
  last_message_at: string;
  created_at: string;
  unread_agent_count: number;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_name: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  resolved:    'bg-green-100 text-green-800 border-green-300',
  closed:      'bg-gray-100 text-gray-600 border-gray-300',
};

const MODE_BADGE: Record<string, string> = {
  ai:     'bg-purple-100 text-purple-700',
  human:  'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

export function AdminSupportPage({ onNavigate, onCartClick, cartItemsCount }: AdminSupportPageProps) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [isAdmin, setIsAdmin]       = useState(false);
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [selected, setSelected]     = useState<Ticket | null>(null);
  const [messages, setMessages]     = useState<SupportMessage[]>([]);
  const [reply, setReply]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [filterStatus, setFilter]   = useState<string>('open');
  const [stats, setStats]           = useState({ open: 0, escalated: 0, resolved: 0, avgCsat: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkAdmin(); }, [user]);
  useEffect(() => { if (isAdmin) { fetchTickets(); fetchStats(); } }, [isAdmin, filterStatus]);
  useEffect(() => { if (selected) fetchMessages(selected.id); }, [selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime: new tickets + new messages
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel('admin_support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets(); fetchStats();
        toast('New support ticket received', { icon: '🎫' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets(); fetchStats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (p) => {
        const msg = p.new as SupportMessage;
        if (selected && msg.ticket_id === selected.id) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [isAdmin, selected]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (data?.role !== 'admin') { navigate('/'); return; }
    setIsAdmin(true);
  };

  const fetchTickets = async () => {
    setLoading(true);
    let q = supabase
      .from('support_tickets')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (filterStatus !== 'all') {
      if (filterStatus === 'escalated') q = q.eq('escalated', true).neq('status', 'resolved');
      else q = q.eq('status', filterStatus);
    }

    const { data } = await q;
    setTickets(data || []);
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('status, escalated, csat_score');
    if (!data) return;
    const open      = data.filter((t) => t.status === 'open').length;
    const escalated = data.filter((t) => t.escalated && t.status !== 'resolved').length;
    const resolved  = data.filter((t) => t.status === 'resolved').length;
    const csatRows  = data.filter((t) => t.csat_score !== null);
    const avgCsat   = csatRows.length ? csatRows.reduce((s, t) => s + t.csat_score, 0) / csatRows.length : 0;
    setStats({ open, escalated, resolved, avgCsat });
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    // Clear unread count
    await supabase.from('support_tickets').update({ unread_agent_count: 0 }).eq('id', ticketId);
  };

  const handleTakeover = async () => {
    if (!selected || !user) return;
    const { error } = await supabase.rpc('agent_takeover_ticket', {
      p_ticket_id: selected.id,
      p_agent_id:  user.id,
    });
    if (error) { toast.error(error.message); return; }
    setSelected({ ...selected, mode: 'human', assigned_to: user.id });
    toast.success('You have taken over this ticket');
    fetchTickets();
  };

  const handleReply = async () => {
    if (!reply.trim() || !selected || !user) return;
    setSending(true);
    try {
      const { data: agentData } = await supabase.from('users').select('username').eq('id', user.id).single();
      await supabase.from('support_messages').insert({
        ticket_id:  selected.id,
        role:       'assistant',
        content:    reply.trim(),
        agent_name: agentData?.username || 'Support Agent',
      });
      await supabase.from('support_tickets').update({
        last_message_at: new Date().toISOString(),
        status: 'in_progress',
      }).eq('id', selected.id);
      setReply('');
      fetchTickets();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selected || !user) return;
    const { error } = await supabase.rpc('agent_resolve_ticket', {
      p_ticket_id: selected.id,
      p_agent_id:  user.id,
    });
    if (error) { toast.error(error.message); return; }
    setSelected({ ...selected, status: 'resolved', mode: 'closed' });
    toast.success('Ticket resolved');
    fetchTickets();
  };

  const formatTime = (s: string) => {
    const d = new Date(s);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000)  return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="admin" />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage customer conversations</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchTickets(); fetchStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: stats.open, icon: MessageCircle, color: 'text-yellow-600 bg-yellow-100' },
            { label: 'Escalated', value: stats.escalated, icon: AlertCircle, color: 'text-red-600 bg-red-100' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
            { label: 'Avg CSAT', value: stats.avgCsat > 0 ? `${stats.avgCsat.toFixed(1)} ⭐` : '—', icon: Star, color: 'text-purple-600 bg-purple-100' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-320px)] min-h-[500px]">
          {/* Ticket List */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="p-3 border-b border-gray-100 flex flex-wrap gap-1.5">
              {['open', 'escalated', 'in_progress', 'resolved', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterStatus === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No tickets</div>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selected?.id === t.id ? 'bg-purple-50 border-l-2 border-purple-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm text-gray-900 truncate">{t.name}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        {t.unread_agent_count > 0 && (
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${MODE_BADGE[t.mode] || 'bg-gray-100 text-gray-500'}`}>
                          {t.mode}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1.5">{t.subject || t.category}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>
                        {t.status}
                      </Badge>
                      <span className="text-[10px] text-gray-400">{formatTime(t.last_message_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select a ticket to view the conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Ticket Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{selected.name}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-sm text-gray-500">{selected.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                      <Badge className={`text-xs ${MODE_BADGE[selected.mode]}`}>{selected.mode} mode</Badge>
                      {selected.csat_score && (
                        <span className="text-xs text-gray-500">CSAT: {'⭐'.repeat(selected.csat_score)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selected.mode === 'ai' && (
                      <Button size="sm" onClick={handleTakeover} className="bg-purple-600 hover:bg-purple-700 text-xs">
                        <UserCheck className="w-3 h-3 mr-1" /> Take Over
                      </Button>
                    )}
                    {selected.status !== 'resolved' && (
                      <Button size="sm" variant="outline" onClick={handleResolve} className="text-xs border-green-300 text-green-700 hover:bg-green-50">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'system' ? (
                        <div className="w-full text-center">
                          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
                        </div>
                      ) : (
                        <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          {msg.agent_name && (
                            <span className="text-xs text-gray-400 px-1 flex items-center gap-1">
                              <User className="w-3 h-3" /> {msg.agent_name}
                            </span>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white rounded-br-sm'
                              : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm'
                          }`}>
                            {msg.content.split('\n').map((l, i, a) => (
                              <span key={i}>{l}{i < a.length - 1 && <br />}</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-400 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box — only when in human mode and not resolved */}
                {selected.mode === 'human' && selected.status !== 'resolved' ? (
                  <div className="border-t border-gray-100 p-3 flex gap-2 bg-white flex-shrink-0">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                      placeholder="Type your reply..."
                      rows={2}
                      className="flex-1 resize-none text-sm"
                      disabled={sending}
                    />
                    <Button
                      onClick={handleReply}
                      disabled={!reply.trim() || sending}
                      className="bg-purple-600 hover:bg-purple-700 self-end"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : selected.mode === 'ai' ? (
                  <div className="border-t border-gray-100 p-3 bg-white flex-shrink-0 text-center">
                    <p className="text-xs text-gray-400">AI is handling this conversation. Click <strong>Take Over</strong> to reply as a human agent.</p>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 p-3 bg-white flex-shrink-0 text-center">
                    <p className="text-xs text-gray-400">This ticket is resolved.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
