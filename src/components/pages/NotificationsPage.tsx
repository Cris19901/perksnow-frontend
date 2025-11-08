import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Heart, MessageCircle, ShoppingCart, UserPlus, Package, Star, CheckCheck } from 'lucide-react';

const mockNotifications = [
  {
    id: 1,
    type: 'like',
    user: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    content: 'liked your post',
    image: 'https://images.unsplash.com/photo-1656360088744-f99fc89d56d4?w=100',
    timestamp: '5m ago',
    read: false,
  },
  {
    id: 2,
    type: 'comment',
    user: {
      name: 'Mike Wilson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    content: 'commented on your post: "This looks amazing! Where can I get one?"',
    timestamp: '1h ago',
    read: false,
  },
  {
    id: 3,
    type: 'order',
    user: {
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
    content: 'purchased your product "Wireless Headphones"',
    timestamp: '2h ago',
    read: true,
  },
  {
    id: 4,
    type: 'follow',
    user: {
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    content: 'started following you',
    timestamp: '3h ago',
    read: true,
  },
  {
    id: 5,
    type: 'review',
    user: {
      name: 'Lisa Anderson',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    content: 'left a 5-star review on your product',
    timestamp: '5h ago',
    read: true,
  },
  {
    id: 6,
    type: 'order',
    user: {
      name: 'David Kim',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
    content: 'Order #12345 has been delivered',
    timestamp: '1d ago',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'order':
      return <ShoppingCart className="w-4 h-4 text-green-500" />;
    case 'follow':
      return <UserPlus className="w-4 h-4 text-purple-500" />;
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
    case 'delivery':
      return <Package className="w-4 h-4 text-orange-500" />;
    default:
      return null;
  }
};

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function NotificationsPage({ onNavigate, onCartClick, cartItemsCount }: NotificationsPageProps) {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  const allNotifications = mockNotifications;
  const unreadNotifications = mockNotifications.filter((n) => !n.read);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="notifications"
      />

      <div className="max-w-[800px] mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl">Notifications</h1>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </Button>
              )}
            </div>

            <Tabs defaultValue="all">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-initial">
                  All {allNotifications.length > 0 && `(${allNotifications.length})`}
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 sm:flex-initial">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <div className="divide-y divide-gray-100">
                  {allNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-purple-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar>
                            <AvatarImage src={notification.user.avatar} />
                            <AvatarFallback>{notification.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span>{notification.user.name}</span>{' '}
                            <span className="text-gray-600">{notification.content}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                        </div>

                        {notification.image && (
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={notification.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {!notification.read && (
                          <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="unread" className="mt-0">
                <div className="divide-y divide-gray-100">
                  {unreadNotifications.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">You're all caught up!</p>
                      <p className="text-sm text-gray-400 mt-1">No unread notifications</p>
                    </div>
                  ) : (
                    unreadNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors bg-purple-50/50"
                      >
                        <div className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar>
                              <AvatarImage src={notification.user.avatar} />
                              <AvatarFallback>{notification.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span>{notification.user.name}</span>{' '}
                              <span className="text-gray-600">{notification.content}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                          </div>

                          {notification.image && (
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={notification.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
