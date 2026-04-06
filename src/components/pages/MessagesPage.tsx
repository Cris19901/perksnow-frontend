import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MobileBottomNav } from '../MobileBottomNav';
import { Search, Send, ArrowLeft, Inbox, MessageSquarePlus } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
}

function avatarFor(avatar: string | null, id: string) {
  return avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
}

function displayName(conv: Conversation) {
  return conv.other_name || conv.other_username || 'User';
}

function timeLabel(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

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
  const [newUserSearch, setNewUserSearch] = useState('');
  const [newUserResults, setNewUserResults] = useState<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    } catch (err: any) {
      toast.error('Could not load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

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
      // Mark as read
      await supabase.rpc('mark_conversation_read', { p_conversation_id: convId });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, my_unread: 0 } : c));
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (active) fetchMessages(active.id);
  }, [active, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: new messages in active conversation
  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`conv_${active.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${active.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        // Mark read immediately since we're watching
        supabase.rpc('mark_conversation_read', { p_conversation_id: active.id });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active]);

  // Realtime: update conversation list when new messages arrive in any conv
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conv_list_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, () => { fetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const sendMessage = async () => {
    if (!text.trim() || !active || !user || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: active.id,
        sender_id: user.id,
        content,
      });
      if (error) throw error;
    } catch {
      toast.error('Failed to send');
      setText(content);
    } finally {
      setSending(false);
    }
  };

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
      // Find and activate the new conversation
      const { data: convs } = await supabase.from('my_conversations').select('*').eq('id', data).single();
      if (convs) setActive(convs as Conversation);
    } catch (err: any) {
      toast.error('Could not start conversation: ' + err.message);
    }
  };

  const filtered = conversations.filter(c =>
    !search || displayName(c).toLowerCase().includes(search.toLowerCase())
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const showList = !active || !isMobile;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="messages" />

      <div className="flex-1 max-w-[1200px] w-full mx-auto px-0 sm:px-4 py-0 sm:py-4 pb-16 md:pb-0">
        <div className="bg-white sm:rounded-xl sm:border border-gray-200 overflow-hidden h-[calc(100vh-112px)] md:h-[calc(100vh-88px)] flex">

          {/* ---- Conversations sidebar ---- */}
          <div className={`flex flex-col w-full md:w-[320px] md:border-r border-gray-200 flex-shrink-0 ${active ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Messages</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="New message"
                onClick={() => setShowNewChat(v => !v)}
              >
                <MessageSquarePlus className="w-5 h-5 text-purple-600" />
              </Button>
            </div>

            {/* New chat search */}
            {showNewChat && (
              <div className="px-3 py-2 border-b border-gray-100 bg-purple-50">
                <Input
                  placeholder="Search users to message…"
                  value={newUserSearch}
                  onChange={e => searchUsers(e.target.value)}
                  autoFocus
                  className="bg-white text-sm"
                />
                {newUserResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newUserResults.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors text-left"
                        onClick={() => startConversation(u.id)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={avatarFor(u.avatar_url, u.id)} />
                          <AvatarFallback>{(u.full_name || u.username || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                          {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search bar */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-sm bg-gray-50"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center px-4">
                  <Inbox className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="font-medium text-gray-500 text-sm">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Tap the icon above to start chatting</p>
                </div>
              ) : (
                filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setActive(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${active?.id === conv.id ? 'bg-purple-50' : ''}`}
                  >
                    <Avatar className="w-11 h-11 flex-shrink-0">
                      <AvatarImage src={avatarFor(conv.other_avatar, conv.other_user_id)} />
                      <AvatarFallback>{displayName(conv)[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm truncate ${conv.my_unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                          {displayName(conv)}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {timeLabel(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${conv.my_unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                          {conv.last_message || 'Start a conversation'}
                        </p>
                        {conv.my_unread > 0 && (
                          <span className="ml-2 flex-shrink-0 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {conv.my_unread > 9 ? '9+' : conv.my_unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ---- Chat panel ---- */}
          <div className={`flex-1 flex flex-col min-w-0 ${!active ? 'hidden md:flex' : 'flex'}`}>
            {active ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 -ml-1"
                    onClick={() => setActive(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={avatarFor(active.other_avatar, active.other_user_id)} />
                    <AvatarFallback>{displayName(active)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{displayName(active)}</p>
                    {active.other_username && (
                      <p className="text-xs text-gray-400">@{active.other_username}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mb-3">
                        <Send className="w-6 h-6 text-purple-400" />
                      </div>
                      <p className="font-medium text-gray-600 text-sm">Say hello to {displayName(active)}</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[72%] rounded-2xl px-4 py-2 text-sm ${
                            isMe
                              ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}>
                            <p className="leading-snug">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <Input
                      className="flex-1 min-h-[40px] text-sm resize-none"
                      placeholder="Type a message…"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                    />
                    <Button
                      size="icon"
                      className="bg-gradient-to-br from-purple-600 to-pink-600 h-10 w-10 flex-shrink-0"
                      disabled={!text.trim() || sending}
                      onClick={sendMessage}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-5">
                  <Inbox className="w-10 h-10 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Messages</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Select a conversation or start a new one using the icon at the top.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav currentPage="messages" onNavigate={onNavigate} />
    </div>
  );
}
