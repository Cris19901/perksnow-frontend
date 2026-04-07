import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Search, Send, ArrowLeft, Inbox, MessageSquarePlus,
  Check, CheckCheck, X, Smile, ImageIcon, Mic,
  MoreVertical, Copy, Trash2,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  last_message: string | null;
  last_message_at: string;
  my_unread: number;
  other_user_id: string;
  other_name: string | null;
  other_username: string | null;
  other_avatar: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  _pending?: boolean;
}

interface UserResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarFor(url: string | null, seed: string) {
  return url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

function displayName(conv: Pick<Conversation, 'other_name' | 'other_username' | 'other_user_id'>) {
  return conv.other_name || conv.other_username || 'User';
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConvTime(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)     return 'now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return formatTime(dateStr);
  if (diff < 604800) return d.toLocaleDateString('en-NG', { weekday: 'short' });
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function dateSeparatorLabel(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1)  return 'Today';
  if (diff < 2)  return 'Yesterday';
  if (diff < 7)  return d.toLocaleDateString('en-NG', { weekday: 'long' });
  return d.toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupMessagesByDay(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let last = '';
  messages.forEach(m => {
    const day = new Date(m.created_at).toDateString();
    if (day !== last) {
      groups.push({ label: dateSeparatorLabel(m.created_at), messages: [] });
      last = day;
    }
    groups[groups.length - 1].messages.push(m);
  });
  return groups;
}

// ─── Emoji picker (common emojis, no extra library) ───────────────────────────

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🥺','😭','🤣','😅','🙏','👍','👎','❤️','🔥','✨','🎉','💯','😮','🤔','💪','🙌','👏','🫂','😊','🤗','😇','🥳','🤑','💰','💸','🇳🇬','🎊','👀','💬','📱','🚀'];

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="absolute bottom-14 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50 w-72">
      <div className="grid grid-cols-9 gap-1">
        {EMOJIS.map(e => (
          <button
            key={e}
            className="text-xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
            onClick={() => onPick(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({
  msg, isMe, showAvatar, otherAvatar, otherSeed, onCopy, onDelete,
}: {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  otherAvatar: string | null;
  otherSeed: string;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <div className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar placeholder (keep alignment consistent) */}
      <div className="w-7 flex-shrink-0">
        {!isMe && showAvatar && (
          <Avatar className="w-7 h-7">
            <AvatarImage src={avatarFor(otherAvatar, otherSeed)} />
            <AvatarFallback className="text-xs">U</AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={`relative max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div
          className={`relative px-4 py-2.5 text-sm leading-snug shadow-sm cursor-pointer select-text
            ${isMe
              ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white border border-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
            }
            ${msg._pending ? 'opacity-60' : ''}`}
          onContextMenu={e => { e.preventDefault(); setMenu(v => !v); }}
        >
          <span>{msg.content}</span>

          {/* Context menu */}
          {menu && (
            <div className={`absolute bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-sm text-gray-800 min-w-[130px]`}>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                onClick={() => { onCopy(msg.content); setMenu(false); }}
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              {isMe && !msg._pending && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
                  onClick={() => { onDelete(msg.id); setMenu(false); }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Time + read status */}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
          {isMe && (
            msg._pending
              ? <Check className="w-3 h-3 text-gray-300" />
              : msg.is_read
                ? <CheckCheck className="w-3 h-3 text-purple-500" />
                : <CheckCheck className="w-3 h-3 text-gray-300" />
          )}
        </div>
      </div>

      {/* Close menu overlay */}
      {menu && (
        <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
      )}
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConvRow({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-0 ${active ? 'bg-purple-50' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarFor(conv.other_avatar, conv.other_user_id)} />
          <AvatarFallback>{displayName(conv)[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {/* Online dot placeholder */}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${conv.my_unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
            {displayName(conv)}
          </p>
          <span className={`text-[11px] flex-shrink-0 ml-2 ${conv.my_unread > 0 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            {formatConvTime(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${conv.my_unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
            {conv.last_message || 'Start a conversation'}
          </p>
          {conv.my_unread > 0 && (
            <span className="flex-shrink-0 bg-purple-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {conv.my_unread > 99 ? '99+' : conv.my_unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded animate-pulse w-32" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-48" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MessagesPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MessagesPage({ onNavigate, onCartClick, cartItemsCount }: MessagesPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // other user typing
  const [newUserSearch, setNewUserSearch] = useState('');
  const [newUserResults, setNewUserResults] = useState<UserResult[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConvs(true);
      const { data, error } = await supabase
        .from('my_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      setConversations((data ?? []) as Conversation[]);
    } catch {
      toast.error('Could not load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data ?? []) as Message[]);
      await supabase.rpc('mark_conversation_read', { p_conversation_id: convId });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, my_unread: 0 } : c));
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (active) fetchMessages(active.id); }, [active, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  // ── Realtime: new messages in active conversation ──
  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`msgs_${active.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${active.id}`,
      }, payload => {
        const msg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev.filter(m => !m._pending), msg];
        });
        if (msg.sender_id !== user?.id) {
          supabase.rpc('mark_conversation_read', { p_conversation_id: active.id });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${active.id}`,
      }, payload => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${active.id}`,
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as Message).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, user?.id]);

  // ── Realtime: typing indicator via Presence ──
  useEffect(() => {
    if (!active || !user) return;

    presenceChannel.current = supabase.channel(`typing_${active.id}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel.current
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.current?.presenceState() ?? {};
        const others = Object.keys(state).filter(k => k !== user.id);
        setIsTyping(others.some(k => (state[k] as any[]).some((p: any) => p.typing)));
      })
      .subscribe();

    return () => {
      if (presenceChannel.current) supabase.removeChannel(presenceChannel.current);
    };
  }, [active, user]);

  // ── Realtime: conv list updates ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conv_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, fetchConversations)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  // ── Broadcast typing ──
  const broadcastTyping = (typing: boolean) => {
    presenceChannel.current?.track({ typing });
  };

  const handleTextChange = (val: string) => {
    setText(val);
    broadcastTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => broadcastTyping(false), 2000);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // ── Send message ──
  const sendMessage = async () => {
    if (!text.trim() || !active || !user || sending) return;
    const content = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    broadcastTyping(false);
    setShowEmoji(false);

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: active.id,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages(prev => [...prev, optimistic]);

    setSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: active.id,
        sender_id: user.id,
        content,
      });
      if (error) throw error;
      // Remove optimistic (realtime will add real one)
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch {
      toast.error('Failed to send');
      setText(content);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── Delete message ──
  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from('direct_messages').delete().eq('id', id);
      if (error) throw error;
    } catch {
      toast.error('Failed to delete message');
    }
  };

  // ── User search for new chat ──
  const searchUsers = async (q: string) => {
    setNewUserSearch(q);
    if (q.length < 2) { setNewUserResults([]); return; }
    const { data } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .neq('id', user!.id)
      .limit(8);
    setNewUserResults(data ?? []);
  };

  const startConversation = async (otherId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', { p_other_user_id: otherId });
      if (error) throw error;
      setShowNewChat(false);
      setNewUserSearch('');
      setNewUserResults([]);
      await fetchConversations();
      const { data: convRow } = await supabase.from('my_conversations').select('*').eq('id', data).single();
      if (convRow) setActive(convRow as Conversation);
    } catch (err: any) {
      toast.error('Could not start conversation');
    }
  };

  const filtered = conversations.filter(c =>
    !search || displayName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.other_username || '').toLowerCase().includes(search.toLowerCase())
  );

  const messageGroups = groupMessagesByDay(messages);

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="messages" />

      <div className="flex-1 max-w-[1200px] w-full mx-auto px-0 sm:px-4 py-0 sm:py-4">
        <div className="bg-white sm:rounded-2xl sm:border border-gray-200 overflow-hidden flex"
             style={{ height: 'calc(100vh - 64px - env(safe-area-inset-bottom, 0px) - 2rem)' }}>

          {/* ── Sidebar ── */}
          <div className={`flex flex-col w-full md:w-[340px] md:border-r border-gray-100 flex-shrink-0 ${active ? 'hidden md:flex' : 'flex'}`}>

            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              <Button
                variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-purple-50"
                onClick={() => { setShowNewChat(v => !v); setNewUserSearch(''); setNewUserResults([]); }}
                title="New message"
              >
                {showNewChat
                  ? <X className="w-5 h-5 text-gray-500" />
                  : <MessageSquarePlus className="w-5 h-5 text-purple-600" />
                }
              </Button>
            </div>

            {/* New chat panel */}
            {showNewChat && (
              <div className="px-3 pb-3 pt-2 border-b border-gray-100 bg-purple-50/50">
                <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Start new conversation</p>
                <Input
                  placeholder="Search by name or username…"
                  value={newUserSearch}
                  onChange={e => searchUsers(e.target.value)}
                  autoFocus
                  className="bg-white text-sm h-9"
                />
                {newUserResults.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                    {newUserResults.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors text-left"
                        onClick={() => startConversation(u.id)}
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={avatarFor(u.avatar_url, u.id)} />
                          <AvatarFallback>{(u.full_name || u.username || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{u.full_name || u.username}</p>
                          {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {newUserSearch.length >= 2 && newUserResults.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No users found</p>
                )}
              </div>
            )}

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-sm bg-gray-50 border-0 rounded-xl focus-visible:ring-1"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-6">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-purple-300" />
                  </div>
                  <p className="font-semibold text-gray-600 text-sm mb-1">
                    {search ? 'No results' : 'No conversations yet'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {search ? 'Try a different name' : 'Tap the + icon above to start chatting'}
                  </p>
                </div>
              ) : (
                filtered.map(conv => (
                  <ConvRow
                    key={conv.id}
                    conv={conv}
                    active={active?.id === conv.id}
                    onClick={() => setActive(conv)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Chat panel ── */}
          <div className={`flex-1 flex flex-col min-w-0 ${!active ? 'hidden md:flex' : 'flex'}`}>
            {active ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white z-10">
                  <Button
                    variant="ghost" size="icon"
                    className="md:hidden h-9 w-9 rounded-xl hover:bg-gray-100 -ml-1"
                    onClick={() => setActive(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar
                    className="w-10 h-10 cursor-pointer"
                    onClick={() => setShowInfo(v => !v)}
                  >
                    <AvatarImage src={avatarFor(active.other_avatar, active.other_user_id)} />
                    <AvatarFallback>{displayName(active)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{displayName(active)}</p>
                    {isTyping
                      ? <p className="text-xs text-purple-500 font-medium">typing…</p>
                      : active.other_username
                        ? <p className="text-xs text-gray-400">@{active.other_username}</p>
                        : null
                    }
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Avatar className="w-20 h-20 mb-4 ring-4 ring-purple-100">
                        <AvatarImage src={avatarFor(active.other_avatar, active.other_user_id)} />
                        <AvatarFallback className="text-2xl">{displayName(active)[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-bold text-gray-800 text-lg">{displayName(active)}</p>
                      {active.other_username && (
                        <p className="text-sm text-gray-400 mb-4">@{active.other_username}</p>
                      )}
                      <p className="text-sm text-gray-500 max-w-xs">
                        This is the beginning of your conversation. Say hello!
                      </p>
                    </div>
                  ) : (
                    messageGroups.map((group, gi) => (
                      <div key={gi}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2">{group.label}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <div className="space-y-1">
                          {group.messages.map((msg, mi) => {
                            const isMe = msg.sender_id === user?.id;
                            const nextMsg = group.messages[mi + 1];
                            const showAvatar = !isMe && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                            const sameAsPrev = mi > 0 && group.messages[mi - 1].sender_id === msg.sender_id;

                            return (
                              <div key={msg.id} className={sameAsPrev ? 'mt-0.5' : 'mt-2'}>
                                <Bubble
                                  msg={msg}
                                  isMe={isMe}
                                  showAvatar={showAvatar}
                                  otherAvatar={active.other_avatar}
                                  otherSeed={active.other_user_id}
                                  onCopy={t => { navigator.clipboard.writeText(t); toast.success('Copied'); }}
                                  onDelete={deleteMessage}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-end gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={avatarFor(active.other_avatar, active.other_user_id)} />
                        <AvatarFallback className="text-xs">U</AvatarFallback>
                      </Avatar>
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0 relative">
                  {showEmoji && <EmojiPicker onPick={e => { setText(t => t + e); textareaRef.current?.focus(); }} />}
                  <div className="flex items-end gap-2">
                    <Button
                      variant="ghost" size="icon"
                      className="h-10 w-10 rounded-xl flex-shrink-0 hover:bg-purple-50"
                      onClick={() => setShowEmoji(v => !v)}
                    >
                      <Smile className={`w-5 h-5 ${showEmoji ? 'text-purple-600' : 'text-gray-400'}`} />
                    </Button>

                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-200 transition-all">
                      <textarea
                        ref={textareaRef}
                        className="w-full bg-transparent text-sm resize-none outline-none min-h-[22px] max-h-[120px] leading-snug placeholder-gray-400"
                        placeholder="Type a message…"
                        value={text}
                        rows={1}
                        onChange={e => handleTextChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                        }}
                        onClick={() => setShowEmoji(false)}
                      />
                    </div>

                    <Button
                      size="icon"
                      className={`h-10 w-10 rounded-xl flex-shrink-0 transition-all ${
                        text.trim()
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-md hover:shadow-lg hover:scale-105'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!text.trim() || sending}
                      onClick={sendMessage}
                    >
                      <Send className={`w-4 h-4 ${text.trim() ? 'text-white' : 'text-gray-400'}`} />
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-300 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
                </div>
              </>
            ) : (
              /* Empty state when no conversation selected */
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  <MessageSquarePlus className="w-12 h-12 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Send private messages to anyone on LavLay. Select a conversation or start a new one.
                </p>
                <Button
                  className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 gap-2"
                  onClick={() => setShowNewChat(true)}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Start a conversation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav currentPage="messages" onNavigate={onNavigate} />
    </div>
  );
}
