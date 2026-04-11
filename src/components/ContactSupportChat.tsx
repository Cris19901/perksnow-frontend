import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Loader2, ChevronDown,
  Paperclip, Smile, Star, CheckCheck, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
  read?: boolean;
  agentName?: string;
}

interface CollectedInfo {
  name: string | null;
  email: string | null;
  category: string;
  description: string | null;
}

const QUICK_REPLIES = [
  'My withdrawal is stuck',
  'Points not credited',
  'Subscription issue',
  'Account problem',
  'How to earn more?',
];

const STORAGE_KEY = 'lavlay_support_chat';

function loadPersistedChat(): { messages: Message[]; ticketId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { messages: [], ticketId: null };
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* Safari/Firefox fallback: silent */ }
}

export function ContactSupportChat() {
  const { user } = useAuth();
  const [open, setOpen]           = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [ticketId, setTicketId]   = useState<string | null>(null);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [typing, setTyping]       = useState(false);
  const [humanMode, setHumanMode] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [resolved, setResolved]   = useState(false);
  const [csatScore, setCsatScore] = useState<number | null>(null);
  const [csatDone, setCsatDone]   = useState(false);
  const [unread, setUnread]       = useState(false);
  const [proactiveFired, setProactiveFired] = useState(false);
  const [userContext, setUserContext] = useState<{
    name: string; email: string; tier: string; points: number; wallet: number;
  } | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const realtimeCh = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Restore persisted conversation
  useEffect(() => {
    const saved = loadPersistedChat();
    if (saved.messages.length > 0) {
      setMessages(saved.messages);
      setTicketId(saved.ticketId);
    }
  }, []);

  // Fetch user account context for AI personalisation
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('full_name, email, subscription_tier, points_balance, wallet_balance')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserContext({
            name:   data.full_name || user.email?.split('@')[0] || 'User',
            email:  user.email ?? data.email ?? '',
            tier:   data.subscription_tier ?? 'free',
            points: data.points_balance ?? 0,
            wallet: data.wallet_balance ?? 0,
          });
        }
      });
  }, [user]);

  // Persist conversation
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, ticketId }));
    }
  }, [messages, ticketId]);

  // Proactive trigger: open after 45s if user hasn't opened yet
  useEffect(() => {
    if (proactiveFired || open || messages.length > 0) return;
    const timer = setTimeout(() => {
      setProactiveFired(true);
      setUnread(true);
    }, 45000);
    return () => clearTimeout(timer);
  }, [proactiveFired, open, messages.length]);

  // Subscribe to realtime agent messages when in human mode
  useEffect(() => {
    if (!ticketId || !humanMode) return;

    realtimeCh.current = supabase
      .channel(`support_ticket_${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          const msg = payload.new as any;
          if (msg.role === 'assistant' || msg.role === 'system') {
            const newMsg: Message = {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              ts: Date.now(),
              agentName: msg.agent_name,
            };
            setMessages((prev) => [...prev, newMsg]);
            if (!open) { setUnread(true); playNotificationSound(); }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` },
        (payload) => {
          const t = payload.new as any;
          if (t.mode === 'human' && !humanMode) {
            setHumanMode(true);
          }
          if (t.status === 'resolved') {
            setResolved(true);
          }
        }
      )
      .subscribe();

    return () => { realtimeCh.current?.unsubscribe(); };
  }, [ticketId, humanMode, open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const openChat = () => {
    setOpen(true);
    setUnread(false);
    if (messages.length === 0) seedGreeting();
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const seedGreeting = () => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: "Hi there! 👋 I'm LavLay's support assistant.\n\nI can help with points, withdrawals, subscriptions, and account issues. What do you need help with?",
      ts: Date.now(),
    }]);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    setTyping(true);

    // If in human mode, just save to DB and wait for agent
    if (humanMode) {
      await supabase.from('support_messages').insert({ ticket_id: ticketId, role: 'user', content });
      await supabase.from('support_tickets').update({
        last_message_at: new Date().toISOString(),
        unread_agent_count: 1,
      }).eq('id', ticketId);
      setTyping(false);
      setLoading(false);
      return;
    }

    try {
      // Small artificial delay so typing indicator feels natural
      await new Promise((r) => setTimeout(r, 600));

      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: {
          messages: nextMessages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          ticket_id:    ticketId,
          user_id:      user?.id ?? null,
          user_context: userContext ?? null,
        },
      });

      setTyping(false);

      if (error) throw error;

      if (data.human_mode) {
        setHumanMode(true);
        return;
      }

      if (data.ticket_id && !ticketId) setTicketId(data.ticket_id);

      if (data.message) {
        const reply: Message = { id: crypto.randomUUID(), role: 'assistant', content: data.message, ts: Date.now() };
        setMessages([...nextMessages, reply]);
        playNotificationSound();

        if (data.escalated) {
          // Prompt CSAT when ticket is resolved later
        }
      }

      if (data.mode === 'human' || data.human_mode) setHumanMode(true);
    } catch {
      setTyping(false);
      setMessages([...nextMessages, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I ran into a problem. Please email support@lavlay.com and we'll help you right away.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, humanMode, ticketId, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const submitCsat = async (score: number) => {
    setCsatScore(score);
    if (ticketId) {
      await supabase.rpc('submit_csat', { p_ticket_id: ticketId, p_score: score });
    }
    setCsatDone(true);
  };

  const startNewChat = () => {
    setMessages([]);
    setTicketId(null);
    setHumanMode(false);
    setResolved(false);
    setCsatScore(null);
    setCsatDone(false);
    localStorage.removeItem(STORAGE_KEY);
    seedGreeting();
  };

  const chatWidth  = fullscreen ? 'w-full'      : 'w-[380px] max-w-[calc(100vw-32px)]';
  const chatHeight = fullscreen ? 'h-[100dvh]'  : 'max-h-[70dvh] sm:max-h-[580px]';
  const chatPos    = fullscreen ? 'bottom-0 right-0 rounded-none' : 'rounded-2xl';

  return (
    <div
      className={`fixed z-[9999] flex flex-col items-end gap-3 ${fullscreen ? 'inset-0' : ''}`}
      style={fullscreen ? undefined : {
        bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
        right: '16px',
      }}
    >

      {/* Chat window */}
      {open && (
        <div className={`${chatWidth} ${chatHeight} ${chatPos} bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden`}>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-purple-600 ${humanMode ? 'bg-green-400' : 'bg-yellow-300'}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {humanMode && agentName ? agentName : 'LavLay Support'}
                </p>
                <p className="text-white/70 text-xs">
                  {humanMode ? '🟢 Human agent connected' : '🤖 AI assistant · instant replies'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="text-white/60 hover:text-white text-xs hidden sm:block"
                title={fullscreen ? 'Minimise' : 'Expand'}
              >
                {fullscreen ? '⊡' : '⊞'}
              </button>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <ChevronDown className="w-5 h-5" />
              </button>
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
                  <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.agentName && msg.role === 'assistant' && (
                      <span className="text-xs text-gray-400 px-1">{msg.agentName}</span>
                    )}
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}>
                      {msg.content.split('\n').map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'user' && (
                        msg.read
                          ? <CheckCheck className="w-3 h-3 text-purple-400" />
                          : <Check className="w-3 h-3 text-gray-300" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CSAT after resolution */}
            {resolved && !csatDone && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-sm font-medium text-gray-700 mb-3">How was your support experience?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => submitCsat(s)}
                      className={`text-2xl transition-transform hover:scale-125 ${
                        csatScore && s <= csatScore ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            )}
            {csatDone && (
              <div className="text-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  Thanks for your feedback! ✨
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies — only show at start */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2 flex-shrink-0 flex flex-wrap gap-2 bg-gray-50 border-t border-gray-100 pt-2">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => sendMessage(qr)}
                  className="text-xs bg-white border border-purple-200 text-purple-700 rounded-full px-3 py-1.5 hover:bg-purple-50 transition-colors whitespace-nowrap"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          {resolved && csatDone ? (
            <div className="border-t border-gray-100 p-3 text-center bg-white flex-shrink-0">
              <p className="text-xs text-gray-400 mb-2">This conversation is resolved.</p>
              <button onClick={startNewChat} className="text-xs text-purple-600 hover:underline font-medium">
                Start new conversation
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-3 flex items-end gap-2 bg-white flex-shrink-0">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={humanMode ? 'Message your agent...' : 'Type your message...'}
                  rows={1}
                  className="w-full resize-none text-sm rounded-xl border border-gray-200 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[38px] max-h-[100px]"
                  disabled={loading}
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 100) + 'px';
                  }}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Powered by */}
          <div className="text-center py-1 bg-white border-t border-gray-50 flex-shrink-0">
            <span className="text-[10px] text-gray-300">Powered by LavLay · AI + Human Support</span>
          </div>
        </div>
      )}

      {/* FAB button */}
      {!fullscreen && (
        <button
          onClick={open ? () => setOpen(false) : openChat}
          className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform relative"
          aria-label="Contact support"
        >
          {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          {unread && !open && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1">
              1
            </span>
          )}
        </button>
      )}
    </div>
  );
}
