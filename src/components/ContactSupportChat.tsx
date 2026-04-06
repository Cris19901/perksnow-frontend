import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ChatStep = 'closed' | 'greeting' | 'chatting';

export function ContactSupportChat() {
  const { user } = useAuth();
  const [step, setStep] = useState<ChatStep>('closed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = () => {
    setStep('chatting');
    setUnread(false);
    if (messages.length === 0) {
      // Seed with assistant greeting
      setMessages([
        {
          role: 'assistant',
          content: "Hi! 👋 I'm LavLay's support assistant. I can help with points, withdrawals, subscriptions, or account issues.\n\nWhat can I help you with today?",
        },
      ]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeChat = () => {
    setStep('closed');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: {
          messages: newMessages,
          ticket_id: ticketId,
          user_id: user?.id ?? null,
        },
      });

      if (error) throw error;

      const assistantMessage = data.message ?? "I'm sorry, something went wrong.";
      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);

      if (data.ticket_id && !ticketId) {
        setTicketId(data.ticket_id);
      }
      if (data.escalated && !ticketCreated) {
        setTicketCreated(true);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please email us at support@lavlay.com and we'll respond within 24 hours.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {step === 'chatting' && (
        <div className="w-[360px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">LavLay Support</p>
                <p className="text-white/70 text-xs">
                  {ticketCreated ? '✓ Ticket created — agent will follow up' : 'AI-powered · Usually instant'}
                </p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[360px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {formatMessage(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!ticketCreated ? (
            <div className="border-t border-gray-100 p-3 flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 resize-none text-sm min-h-[38px] max-h-[100px] py-2"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 h-9 w-9 p-0 rounded-xl flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">
                Ticket #{ticketId?.slice(0, 8).toUpperCase()} created. We'll email you within 24 hours.
              </p>
              <button
                onClick={() => { setMessages([]); setTicketId(null); setTicketCreated(false); openChat(); }}
                className="text-xs text-purple-600 hover:underline mt-1"
              >
                Start a new conversation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={step === 'chatting' ? closeChat : openChat}
        className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform relative"
        aria-label="Contact support"
      >
        {step === 'chatting' ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        {unread && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}
