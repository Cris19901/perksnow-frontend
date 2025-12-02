import { useState } from 'react';
import { Header } from '../Header';
import { ConversationList } from '../ConversationList';
import { ChatInterface } from '../ChatInterface';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessagesPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MessagesPage({ onCartClick, cartItemsCount }: MessagesPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    otherUser: any;
  } | null>(null);

  const handleSelectConversation = (conversationId: string, otherUser: any) => {
    setSelectedConversation({ id: conversationId, otherUser });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="messages"
        />
        <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Log in to message</h2>
              <p className="text-gray-600 mb-6">
                Connect with sellers and buyers to discuss products and purchases!
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:underline font-medium"
              >
                Log in to continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="messages"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Messages</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Chat with sellers and buyers
          </p>
        </div>

        {/* Messages Layout */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid lg:grid-cols-[380px_1fr] h-[calc(100vh-200px)] min-h-[500px]">
            {/* Conversation List - Hidden on mobile when chat is selected */}
            <div
              className={`border-r border-gray-200 overflow-y-auto ${
                selectedConversation ? 'hidden lg:block' : 'block'
              }`}
            >
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.id}
              />
            </div>

            {/* Chat Interface */}
            <div
              className={`${
                selectedConversation ? 'block' : 'hidden lg:flex'
              } lg:flex flex-col`}
            >
              {selectedConversation ? (
                <ChatInterface
                  conversationId={selectedConversation.id}
                  otherUser={selectedConversation.otherUser}
                  onBack={handleBackToList}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                    <p className="text-gray-500 text-sm">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
