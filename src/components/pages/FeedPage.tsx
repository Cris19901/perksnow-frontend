import { Header } from '../Header';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../Post';
import { ProductPost } from '../ProductPost';
import { Sidebar } from '../Sidebar';

const mockPosts = [
  {
    id: 1,
    author: {
      name: 'Sarah Johnson',
      username: '@sarah_j',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    content: 'Just got back from an amazing hike in the mountains! The views were absolutely breathtaking. 🏔️ Nature never fails to amaze me.',
    image: 'https://images.unsplash.com/photo-1617634667039-8e4cb277ab46?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBsYW5kc2NhcGV8ZW58MXx8fHwxNzYyNTY1MTE0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 243,
    comments: 18,
    shares: 5,
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    author: {
      name: 'Mike Wilson',
      username: '@mikew',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    content: 'Made some homemade pasta from scratch today! Cooking has become my new hobby. Anyone else love cooking? Share your favorite recipes! 🍝👨‍🍳',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzYyNTAzOTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 187,
    comments: 32,
    shares: 12,
    timestamp: '5 hours ago',
  },
  {
    id: 3,
    author: {
      name: 'Emma Davis',
      username: '@emma_d',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
    content: 'Throwback to my trip to Iceland last month. The Northern Lights were absolutely magical! Can\'t wait to go back. ✨',
    image: 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBhZHZlbnR1cmV8ZW58MXx8fHwxNzYyNTU3ODg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 521,
    comments: 67,
    shares: 23,
    timestamp: '1 day ago',
  },
  {
    id: 4,
    author: {
      name: 'John Smith',
      username: '@johnsmith',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    content: 'City lights and late nights. There\'s something magical about the urban landscape after dark. 🌃',
    image: 'https://images.unsplash.com/photo-1757730979491-9bf86e48cba7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwdXJiYW58ZW58MXx8fHwxNzYyNjA2ODkxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 156,
    comments: 24,
    shares: 8,
    timestamp: '2 days ago',
  },
];

const productPosts = [
  {
    id: 101,
    author: {
      name: 'TechStore Official',
      username: '@techstore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    content: '🎧 New arrival! Experience premium sound quality with our latest wireless headphones. Perfect for music lovers and professionals. Limited stock available!',
    product: {
      name: 'Wireless Noise-Cancelling Headphones',
      price: 199.99,
      image: 'https://images.unsplash.com/photo-1717295248302-543d5a49091f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGdhZGdldHN8ZW58MXx8fHwxNzYyNTM0MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      category: 'Electronics',
    },
    likes: 456,
    comments: 89,
    shares: 34,
    timestamp: '3 hours ago',
  },
  {
    id: 102,
    author: {
      name: 'FashionHub',
      username: '@fashionhub',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
    content: '☀️ Summer collection is here! This beautiful floral maxi dress is perfect for your beach vacation or outdoor events. Get yours now!',
    product: {
      name: 'Summer Floral Maxi Dress',
      price: 79.99,
      image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmd8ZW58MXx8fHwxNzYyNTczMzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      category: 'Fashion',
    },
    likes: 234,
    comments: 45,
    shares: 12,
    timestamp: '6 hours ago',
  },
];

interface FeedPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
}

export function FeedPage({ onNavigate, onCartClick, onAddToCart, cartItemsCount }: FeedPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onNavigate={onNavigate} 
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />
      
      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
            <Stories />
            <CreatePost />
            
            {/* Feed */}
            <div className="space-y-4 sm:space-y-6">
              {mockPosts.map((post) => (
                <Post key={post.id} {...post} />
              ))}
              {productPosts.map((post) => (
                <ProductPost key={post.id} {...post} onAddToCart={onAddToCart} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
