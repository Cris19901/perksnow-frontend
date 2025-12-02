import { Search, Home, Store, Bell, MessageCircle, ShoppingCart, Menu, User, Settings, Plus, Coins, Bookmark, LogOut, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { CurrencySwitcher } from './CurrencySwitcher';
import { SearchBar } from './SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
  currentPage?: string;
}

export function Header({ onNavigate, onCartClick, cartItemsCount = 0, currentPage = 'feed' }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('points_balance, username, full_name, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setPointsBalance(data?.points_balance || 0);
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate?.('');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate?.('feed')}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white">S</span>
            </div>
            <span className="hidden sm:block">SocialHub</span>
          </div>

          {/* Search - Hidden on mobile */}
          <div className="hidden md:flex flex-1 mx-4">
            <SearchBar onNavigate={onNavigate} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            <button 
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'feed' ? 'bg-gray-100' : ''}`}
              onClick={() => onNavigate?.('feed')}
            >
              <Home className="w-6 h-6" />
            </button>
            <button 
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'marketplace' ? 'bg-gray-100' : ''}`}
              onClick={() => onNavigate?.('marketplace')}
            >
              <Store className="w-6 h-6" />
            </button>
            <button 
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'messages' ? 'bg-gray-100' : ''}`}
              onClick={() => onNavigate?.('messages')}
            >
              <MessageCircle className="w-6 h-6" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                3
              </Badge>
            </button>
            <button 
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'notifications' ? 'bg-gray-100' : ''}`}
              onClick={() => onNavigate?.('notifications')}
            >
              <Bell className="w-6 h-6" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                5
              </Badge>
            </button>
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-purple-600 text-xs">
                  {cartItemsCount}
                </Badge>
              )}
            </button>
            <CurrencySwitcher />

            {/* Points Display */}
            {user && (
              <button
                onClick={() => onNavigate?.('points')}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg transition-shadow"
              >
                <Coins className="w-4 h-4" />
                <span className="font-bold">{pointsBalance.toLocaleString()}</span>
                <span className="text-xs opacity-90">pts</span>
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all">
                  <AvatarImage src={userProfile?.avatar_url || "https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"} />
                  <AvatarFallback>{userProfile?.full_name?.[0] || userProfile?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={userProfile?.avatar_url} />
                      <AvatarFallback>{userProfile?.full_name?.[0] || userProfile?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{userProfile?.full_name || userProfile?.username || 'User'}</p>
                      <p className="text-xs text-gray-500">@{userProfile?.username || 'username'}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Points - Mobile visible */}
                <DropdownMenuItem onClick={() => onNavigate?.('points')} className="lg:hidden">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span>My Points</span>
                    </div>
                    <span className="font-bold text-purple-600">{pointsBalance.toLocaleString()}</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onNavigate?.('profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('bookmarks')}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Saved Posts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('create-product')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Sell Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-purple-600 text-xs">
                  {cartItemsCount}
                </Badge>
              )}
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate through the app
                </SheetDescription>
                <div className="flex flex-col gap-4 mt-4">
                  <Button 
                    variant={currentPage === 'feed' ? 'default' : 'ghost'} 
                    className="justify-start gap-2"
                    onClick={() => onNavigate?.('feed')}
                  >
                    <Home className="w-5 h-5" />
                    Home
                  </Button>
                  <Button 
                    variant={currentPage === 'marketplace' ? 'default' : 'ghost'} 
                    className="justify-start gap-2"
                    onClick={() => onNavigate?.('marketplace')}
                  >
                    <Store className="w-5 h-5" />
                    Marketplace
                  </Button>
                  <Button 
                    variant={currentPage === 'messages' ? 'default' : 'ghost'} 
                    className="justify-start gap-2 relative"
                    onClick={() => onNavigate?.('messages')}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Messages
                    <Badge className="ml-auto bg-red-500">3</Badge>
                  </Button>
                  <Button 
                    variant={currentPage === 'notifications' ? 'default' : 'ghost'} 
                    className="justify-start gap-2 relative"
                    onClick={() => onNavigate?.('notifications')}
                  >
                    <Bell className="w-5 h-5" />
                    Notifications
                    <Badge className="ml-auto bg-red-500">5</Badge>
                  </Button>
                  <div className="border-t pt-4 mt-4">
                    <div 
                      className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                      onClick={() => onNavigate?.('profile')}
                    >
                      <Avatar>
                        <AvatarImage src="https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080" />
                        <AvatarFallback>ME</AvatarFallback>
                      </Avatar>
                      <div>
                        <p>My Profile</p>
                        <p className="text-sm text-gray-500">View profile</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        onClick={() => onNavigate?.('create-product')}
                      >
                        <Plus className="w-5 h-5" />
                        Sell Product
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        onClick={() => onNavigate?.('settings')}
                      >
                        <Settings className="w-5 h-5" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
