import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  User, Bell, Lock, ShieldCheck, Loader2,
  Eye, EyeOff, LogOut, Trash2, Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SettingsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function SettingsPage({ onNavigate, onCartClick, cartItemsCount }: SettingsPageProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState({
    full_name: '', username: '', bio: '', location: '', website: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPass: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    new_messages: true,
    likes_comments: true,
    new_followers: true,
    points_earned: true,
    withdrawal_updates: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('full_name, username, bio, location, website, two_factor_enabled, notification_prefs')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          username:  data.username  || '',
          bio:       data.bio       || '',
          location:  data.location  || '',
          website:   data.website   || '',
        });
        setTwoFactorEnabled(!!data.two_factor_enabled);
        if (data.notification_prefs) {
          setNotifPrefs(prev => ({ ...prev, ...data.notification_prefs }));
        }
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!profile.username.trim())  { toast.error('Username is required');  return; }

    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name.trim(),
          username:  profile.username.trim().replace(/^@/, ''),
          bio:       profile.bio.trim() || null,
          location:  profile.location.trim() || null,
          website:   profile.website.trim() || null,
        })
        .eq('id', user!.id);
      if (error) throw error;
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message?.includes('unique') ? 'Username already taken' : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.newPass) { toast.error('Enter a new password'); return; }
    if (passwords.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }

    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
      if (error) throw error;
      setPasswords({ current: '', newPass: '', confirm: '' });
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    setToggling2FA(true);
    try {
      const { error } = await supabase.from('users').update({ two_factor_enabled: enabled }).eq('id', user!.id);
      if (error) throw error;
      setTwoFactorEnabled(enabled);
      toast.success(enabled ? '2FA enabled — you\'ll get a code by email on each login' : '2FA disabled');
    } catch {
      toast.error('Failed to update 2FA');
    } finally {
      setToggling2FA(false);
    }
  };

  const saveNotifPrefs = async (prefs: typeof notifPrefs) => {
    setNotifSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_prefs: prefs })
        .eq('id', user!.id);
      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setNotifSaving(false);
    }
  };

  const toggleNotif = (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    saveNotifPrefs(updated);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const PwField = ({
    id, label, field,
  }: { id: string; label: string; field: 'current' | 'newPass' | 'confirm' }) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type={showPw[field] ? 'text' : 'password'}
          value={passwords[field]}
          onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
          className="pr-10"
          placeholder="••••••••"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
        >
          {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const NotifRow = ({
    label, sub, field,
  }: { label: string; sub: string; field: keyof typeof notifPrefs }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <Switch
        checked={notifPrefs[field]}
        onCheckedChange={() => toggleNotif(field)}
        disabled={notifSaving}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList className="w-full bg-white border border-gray-200 h-10">
            <TabsTrigger value="account"  className="flex-1 text-xs sm:text-sm">Account</TabsTrigger>
            <TabsTrigger value="security" className="flex-1 text-xs sm:text-sm">Security</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 text-xs sm:text-sm">Alerts</TabsTrigger>
          </TabsList>

          {/* ── ACCOUNT ── */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" /> Profile Information
                </CardTitle>
                <CardDescription>How others see you on LavLay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={profile.full_name}
                          onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                          placeholder="Your full name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="username">Username *</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                          <Input
                            id="username"
                            value={profile.username}
                            onChange={e => setProfile(p => ({ ...p, username: e.target.value.replace(/^@/, '').replace(/\s/g, '') }))}
                            placeholder="username"
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">Contact support to change your email</p>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        value={profile.bio}
                        onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell people a little about yourself"
                        maxLength={160}
                        rows={3}
                        className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-400 text-right">{profile.bio.length}/160</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profile.location}
                          onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                          placeholder="Lagos, Nigeria"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={profile.website}
                          onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                          placeholder="https://yoursite.com"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={saveProfile}
                      disabled={profileSaving}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {profileSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Check className="w-4 h-4 mr-2" />Save Changes</>}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sign out & danger zone */}
            <Card className="border-red-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-600">Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
                <p className="text-xs text-gray-400">
                  To permanently delete your account, contact support@lavlay.com
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4" /> Change Password
                </CardTitle>
                <CardDescription>Use at least 8 characters with a mix of letters and numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PwField id="newPass"  label="New Password"     field="newPass"  />
                <PwField id="confirm"  label="Confirm Password" field="confirm"  />

                {passwords.newPass && passwords.confirm && passwords.newPass !== passwords.confirm && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {passwords.newPass && passwords.newPass.length > 0 && passwords.newPass.length < 8 && (
                  <p className="text-xs text-amber-500">Password too short (min 8 characters)</p>
                )}

                <Button
                  onClick={changePassword}
                  disabled={pwSaving || !passwords.newPass || !passwords.confirm}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {pwSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : 'Update Password'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-4 h-4 text-purple-600" /> Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">Email verification code</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {twoFactorEnabled
                        ? '✅ Active — a code is sent to your email each login'
                        : 'Receive a one-time code by email when you sign in'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={toggle2FA}
                    disabled={toggling2FA}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-4 h-4" /> Notification Preferences
                </CardTitle>
                <CardDescription>Choose what you want to be notified about</CardDescription>
              </CardHeader>
              <CardContent>
                <NotifRow field="new_messages"       label="New Messages"        sub="Get notified when someone sends you a message" />
                <NotifRow field="likes_comments"     label="Likes & Comments"    sub="When someone likes or comments on your posts" />
                <NotifRow field="new_followers"      label="New Followers"       sub="When someone starts following you" />
                <NotifRow field="points_earned"      label="Points Credited"     sub="When points are added to your account" />
                <NotifRow field="withdrawal_updates" label="Withdrawal Updates"  sub="Status changes on your withdrawal requests" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MobileBottomNav currentPage="settings" onNavigate={onNavigate} />
    </div>
  );
}
