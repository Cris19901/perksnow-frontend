import { Search, Home, Store, Bell, MessageCircle, ShoppingCart, Menu, User, Settings, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { CurrencySwitcher } from './CurrencySwitcher';
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
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors bg-gradient-to-r from-purple-600 to-pink-600"
              onClick={() => onNavigate?.('create-product')}
              title="Create Post or Sell Product"
            >
              <Plus className="w-6 h-6 text-white" />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src="https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080" />
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('create-product')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Sell Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('landing')}>
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
