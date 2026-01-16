import { Search, Home, Store, Bell, MessageCircle, ShoppingCart, Menu, User, Settings, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { CurrencySwitcher } from './CurrencySwitcher';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function Header({ onCartClick, cartItemsCount = 0 }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentPage = location.pathname.slice(1) || 'feed';

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

          {/* Search - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-10 bg-gray-50 border-gray-200"
              />
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
    </header>
  );
}
