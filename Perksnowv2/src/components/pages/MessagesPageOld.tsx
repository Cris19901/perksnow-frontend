import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Send, MoreVertical, Phone, Video, Image, Smile } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';

const mockConversations = [
  {
    id: 1,
    user: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      online: true,
    },
    lastMessage: 'Thanks! I just received the package 📦',
    timestamp: '2m ago',
    unread: 2,
  },
  {
    id: 2,
    user: {
      name: 'Mike Wilson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      online: true,
    },
    lastMessage: 'Is this still available?',
    timestamp: '1h ago',
    unread: 0,
  },
  {
    id: 3,
    user: {
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      online: false,
    },
    lastMessage: 'Can you ship to Canada?',
    timestamp: '3h ago',
    unread: 1,
  },
  {
    id: 4,
    user: {
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      online: false,
    },
    lastMessage: 'Great product! Will order more',
    timestamp: '1d ago',
    unread: 0,
  },
];

const mockMessages = [
  {
    id: 1,
    sender: 'them',
    content: 'Hi! I\'m interested in the headphones you\'re selling',
    timestamp: '10:30 AM',
  },
  {
    id: 2,
    sender: 'me',
    content: 'Hello! Yes, they\'re still available. Would you like to know more about them?',
    timestamp: '10:32 AM',
  },
  {
    id: 3,
    sender: 'them',
    content: 'Do they come with a warranty?',
    timestamp: '10:35 AM',
  },
  {
    id: 4,
    sender: 'me',
    content: 'Yes, they come with a 1-year manufacturer warranty and 30-day return policy',
    timestamp: '10:36 AM',
  },
  {
    id: 5,
    sender: 'them',
    content: 'Perfect! I\'ll take them. Can you ship today?',
    timestamp: '10:40 AM',
  },
  {
    id: 6,
    sender: 'me',
    content: 'Absolutely! I can ship within 2 hours. Just place the order and I\'ll get it out right away.',
    timestamp: '10:42 AM',
  },
  {
    id: 7,
    sender: 'them',
    content: 'Thanks! I just received the package 📦',
    timestamp: '2m ago',
  },
];

interface MessagesPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MessagesPage({ onNavigate, onCartClick, cartItemsCount }: MessagesPageProps) {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = mockConversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                        selectedConversation.id === conversation.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={conversation.user.avatar} />
                          <AvatarFallback>{conversation.user.name[0]}</AvatarFallback>
                        </Avatar>
                        {conversation.user.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className="truncate">{conversation.user.name}</p>
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
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={selectedConversation.user.avatar} />
                      <AvatarFallback>{selectedConversation.user.name[0]}</AvatarFallback>
                    </Avatar>
                    {selectedConversation.user.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p>{selectedConversation.user.name}</p>
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
                <div className="space-y-4">
                  {mockMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender === 'me'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'me' ? 'text-purple-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                        // Handle send message
                        setMessageText('');
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0"
                    size="icon"
                    disabled={!messageText.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
