import { Button } from '../ui/button';
import { Heart, Users, Zap, Shield, Globe, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white">S</span>
              </div>
              <span className="text-lg sm:text-xl">SocialHub</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" onClick={() => onNavigate('about')} className="hidden sm:inline-flex">
                About Us
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('login')} size="sm" className="sm:size-default">
                Log In
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={() => onNavigate('signup')}
                size="sm"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
              Connect, Share & Shop with SocialHub
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              The social commerce platform where you can connect with friends, discover communities, and buy & sell products - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={() => onNavigate('signup')}
              >
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('about')}>
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative order-first lg:order-last">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"
                alt="People connecting"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4">Social Commerce Platform</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">Connect, share, and shop all in one place</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Connect with Friends</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Build meaningful connections and stay in touch with friends and family across the globe.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Buy & Sell Products</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Shop from friends and sell your own products through our integrated marketplace feature.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Share Moments</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Post photos, videos, and updates to share your life's special moments with your network.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Discover Communities</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Find and join communities based on your interests, passions, and hobbies.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Experience blazing-fast performance with our optimized platform built for speed.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2">Privacy & Security</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Your data is protected with enterprise-grade security and privacy controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">Ready to get started?</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8">
            Join millions of users already connecting and shopping on SocialHub
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 w-full sm:w-auto"
            onClick={() => onNavigate('signup')}
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">S</span>
                </div>
                <span>SocialHub</span>
              </div>
              <p className="text-sm text-gray-600">
                Connecting people and communities worldwide.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Features</a></li>
                <li><a href="#" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900" onClick={() => onNavigate('about')}>About Us</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gray-900">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            © 2025 SocialHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
