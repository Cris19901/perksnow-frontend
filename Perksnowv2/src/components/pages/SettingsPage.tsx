import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CurrencySwitcher } from '../CurrencySwitcher';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Bell, Lock, Globe, CreditCard, Store, Camera, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { uploadImage, compressImage } from '@/lib/image-upload';
import { useNavigate } from 'react-router-dom';

interface SettingsPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function SettingsPage({ onCartClick, cartItemsCount }: SettingsPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
  });

  // Load user profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('username, full_name, bio, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            username: data.username || '',
            full_name: data.full_name || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || user.user_metadata?.avatar_url || '',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    }

    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      if (!user) return;

      const compressed = await compressImage(file, 512, 512, 0.9);
      const avatarUrl = await uploadImage(compressed, 'avatars', user.id);

      const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;

      setFormData({ ...formData, avatar_url: avatarUrl });
      toast.success('Profile picture updated!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('users')
        .update({
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          bio: formData.bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Error updating profile:', err);

      if (err.code === '23505') {
        toast.error('Username already taken');
      } else {
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
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
            {/* Avatar Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>Update your profile picture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {formData.username?.[0] || formData.full_name?.[0] || user?.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      {uploadingAvatar ? 'Uploading...' : 'Change Picture'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact support to change email</p>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={loading}
                      maxLength={500}
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
                  </div>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
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
