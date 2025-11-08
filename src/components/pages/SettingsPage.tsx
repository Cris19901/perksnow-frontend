import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CurrencySwitcher } from '../CurrencySwitcher';
import { User, Bell, Lock, Globe, CreditCard, Store } from 'lucide-react';

interface SettingsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function SettingsPage({ onNavigate, onCartClick, cartItemsCount }: SettingsPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
      />

      <div className="max-w-[1000px] mx-auto px-4 py-4 sm:py-6">
        <h1 className="text-2xl sm:text-3xl mb-6">Settings</h1>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="John Smith" />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue="@johnsmith" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Input id="bio" defaultValue="Digital creator & entrepreneur 🚀" />
                </div>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Password & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current">Current Password</Label>
                  <Input id="current" type="password" />
                </div>
                <div>
                  <Label htmlFor="new">New Password</Label>
                  <Input id="new" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input id="confirm" type="password" />
                </div>
                <Button variant="outline">Update Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Seller Information
                </CardTitle>
                <CardDescription>Manage your seller account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input id="shopName" defaultValue="John's Shop" />
                </div>
                <div>
                  <Label htmlFor="shopUrl">Shop URL</Label>
                  <Input id="shopUrl" defaultValue="johnsmith.shop" />
                </div>
                <Button variant="outline">Update Shop</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p>New Messages</p>
                    <p className="text-sm text-gray-500">Get notified when someone messages you</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>New Orders</p>
                    <p className="text-sm text-gray-500">Get notified when you receive an order</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Likes & Comments</p>
                    <p className="text-sm text-gray-500">Get notified when someone interacts with your posts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>New Followers</p>
                    <p className="text-sm text-gray-500">Get notified when someone follows you</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Marketing Emails</p>
                    <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Privacy Controls
                </CardTitle>
                <CardDescription>Control who can see your content and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p>Private Account</p>
                    <p className="text-sm text-gray-500">Only approved followers can see your posts</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Show Online Status</p>
                    <p className="text-sm text-gray-500">Let others see when you're active</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Allow Messages from Anyone</p>
                    <p className="text-sm text-gray-500">Anyone can send you messages</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Show Purchase History</p>
                    <p className="text-sm text-gray-500">Display your purchase history on your profile</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Regional Preferences
                </CardTitle>
                <CardDescription>Customize your regional settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Currency</Label>
                  <div className="mt-2">
                    <CurrencySwitcher />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    All prices will be displayed in your selected currency
                  </p>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input id="language" defaultValue="English (US)" />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" defaultValue="Pacific Time (PT)" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p>Dark Mode</p>
                    <p className="text-sm text-gray-500">Use dark theme across the app</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Compact View</p>
                    <p className="text-sm text-gray-500">Show more content on screen</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
