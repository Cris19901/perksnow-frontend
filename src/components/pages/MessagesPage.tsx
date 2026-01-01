import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Send, MoreVertical, Phone, Video, Image, Smile, Inbox } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    online: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface MessagesPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MessagesPage({ onNavigate, onCartClick, cartItemsCount }: MessagesPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // For now, show empty state
      // In a real implementation, you would fetch from a conversations table
      setConversations([]);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      // For now, show empty state
      // In a real implementation, you would fetch from a messages table
      setMessages([]);
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user) return;

    try {
      setSending(true);
      // In a real implementation, you would insert into messages table
      toast.info('Messaging feature coming soon!');
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarUrl = (avatarUrl: string | null, userId: string) => {
    return avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="messages"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[calc(100vh-150px)]">
          <div className="grid md:grid-cols-[350px_1fr] h-full">
            {/* Conversations List */}
            <div className="border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl mb-4">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Inbox className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Start connecting with people and your messages will appear here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                          selectedConversation?.id === conversation.id ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={getAvatarUrl(conversation.user.avatar, conversation.user.id)} />
                            <AvatarFallback>{conversation.user.name[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {conversation.user.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <p className="truncate font-medium">{conversation.user.name}</p>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {conversation.timestamp}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                            {conversation.unread > 0 && (
                              <Badge className="ml-2 bg-purple-600 flex-shrink-0">
                                {conversation.unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={getAvatarUrl(selectedConversation.user.avatar, selectedConversation.user.id)} />
                          <AvatarFallback>{selectedConversation.user.name[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {selectedConversation.user.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{selectedConversation.user.name}</p>
                        <p className="text-sm text-gray-500">
                          {selectedConversation.user.online ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Phone className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Video className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                          <Send className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Start the conversation</h3>
                        <p className="text-sm text-gray-500">
                          Send a message to {selectedConversation.user.name}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender_id === user?.id
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.sender_id === user?.id ? 'text-purple-100' : 'text-gray-500'
                                }`}
                              >
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-end gap-2">
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Image className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Smile className="w-5 h-5" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && messageText.trim()) {
                            handleSendMessage();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0"
                        size="icon"
                        disabled={!messageText.trim() || sending}
                        onClick={handleSendMessage}
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                    <Inbox className="w-12 h-12 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h3>
                  <p className="text-gray-500 max-w-sm">
                    Select a conversation from the sidebar to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
