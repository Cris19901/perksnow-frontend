import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
}

interface ConversationListProps {
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  selectedConversationId?: string;
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();

      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel('conversations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all conversations for current user
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user?.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get other participants and messages for each conversation
      const conversationsWithDetails = await Promise.all(
        participantData.map(async (participant: any) => {
          const conversationId = participant.conversation_id;

          // Get conversation details
          const { data: conversationData } = await supabase
            .from('conversations')
            .select('id, updated_at')
            .eq('id', conversationId)
            .single();

          // Get other user in conversation
          const { data: otherParticipantData } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', user?.id)
            .single();

          let otherUserData = null;
          if (otherParticipantData) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, username, full_name, avatar_url')
              .eq('id', otherParticipantData.user_id)
              .single();
            otherUserData = userData;
          }

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', user?.id);

          return {
            id: conversationId,
            updated_at: conversationData?.updated_at || new Date().toISOString(),
            other_user: otherUserData || { id: '', username: 'Unknown', full_name: null, avatar_url: null },
            last_message: lastMessage,
            unread_count: unreadCount || 0,
          };
        })
      );

      // Sort by most recent
      conversationsWithDetails.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setConversations(conversationsWithDetails);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchConversations}
          className="mt-4 text-purple-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No messages yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Start a conversation with someone!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation.id, conversation.other_user)}
          className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
            selectedConversationId === conversation.id ? 'bg-purple-50' : ''
          }`}
        >
          <div className="flex gap-3">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
              <AvatarFallback>
                {conversation.other_user?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {conversation.other_user?.full_name || conversation.other_user?.username}
                </span>
                {conversation.last_message && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimestamp(conversation.last_message.created_at)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                {conversation.last_message ? (
                  <p className={`text-sm truncate ${
                    conversation.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}>
                    {conversation.last_message.sender_id === user?.id && 'You: '}
                    {truncateMessage(conversation.last_message.content)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No messages yet</p>
                )}

                {conversation.unread_count > 0 && (
                  <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
