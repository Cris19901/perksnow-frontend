import { useState, useEffect, useRef } from 'react';
import { Search, Home, Store, Bell, MessageCircle, ShoppingCart, Menu, User, Settings, Plus, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { CurrencySwitcher } from './CurrencySwitcher';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface HeaderProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface SearchResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export function Header({ onCartClick, cartItemsCount = 0 }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentPage = location.pathname.slice(1) || 'feed';

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setShowMobileSearch(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Get user's avatar and initials
  const userAvatar = user?.avatar_url || '';
  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || 'ME';
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/feed" className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="hidden sm:block font-semibold text-lg">LavLay</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-10 bg-gray-50 border-gray-200"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">Searching...</div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleUserClick(result.username)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={result.avatar_url} />
                          <AvatarFallback>{result.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{result.full_name}</p>
                          <p className="text-xs text-gray-500">@{result.username}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            <Link
              to="/feed"
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'feed' ? 'bg-gray-100' : ''}`}
            >
              <Home className="w-6 h-6" />
            </Link>
            <Link
              to="/marketplace"
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'marketplace' ? 'bg-gray-100' : ''}`}
            >
              <Store className="w-6 h-6" />
            </Link>
            <Link
              to="/messages"
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'messages' ? 'bg-gray-100' : ''}`}
            >
              <MessageCircle className="w-6 h-6" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                3
              </Badge>
            </Link>
            <Link
              to="/notifications"
              className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${currentPage === 'notifications' ? 'bg-gray-100' : ''}`}
            >
              <Bell className="w-6 h-6" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                5
              </Badge>
            </Link>
            <Link
              to="/create-product"
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors bg-gradient-to-r from-purple-600 to-pink-600"
              title="Create Post or Sell Product"
            >
              <Plus className="w-6 h-6 text-white" />
            </Link>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/create-product')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Sell Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Search users"
            >
              <Search className="w-6 h-6" />
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
                    onClick={() => navigate('/feed')}
                  >
                    <Home className="w-5 h-5" />
                    Home
                  </Button>
                  <Button
                    variant={currentPage === 'marketplace' ? 'default' : 'ghost'}
                    className="justify-start gap-2"
                    onClick={() => navigate('/marketplace')}
                  >
                    <Store className="w-5 h-5" />
                    Marketplace
                  </Button>
                  <Button
                    variant={currentPage === 'messages' ? 'default' : 'ghost'}
                    className="justify-start gap-2 relative"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Messages
                    <Badge className="ml-auto bg-red-500">3</Badge>
                  </Button>
                  <Button
                    variant={currentPage === 'notifications' ? 'default' : 'ghost'}
                    className="justify-start gap-2 relative"
                    onClick={() => navigate('/notifications')}
                  >
                    <Bell className="w-5 h-5" />
                    Notifications
                    <Badge className="ml-auto bg-red-500">5</Badge>
                  </Button>
                  <div className="border-t pt-4 mt-4">
                    <div
                      className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                      onClick={() => navigate('/profile')}
                    >
                      <Avatar>
                        <AvatarImage src={userAvatar} />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{user?.full_name || user?.username || 'My Profile'}</p>
                        <p className="text-sm text-gray-500">@{user?.username || 'username'}</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => navigate('/create-product')}
                      >
                        <Plus className="w-5 h-5" />
                        Sell Product
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => navigate('/settings')}
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

      {/* Mobile Search Modal */}
      <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="p-4 text-center text-gray-500">
                  Type at least 2 characters to search
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No users found</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleUserClick(result.username)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={result.avatar_url} />
                        <AvatarFallback>{result.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-semibold">{result.full_name}</p>
                        <p className="text-sm text-gray-500">@{result.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
