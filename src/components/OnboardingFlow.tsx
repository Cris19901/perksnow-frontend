import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { convertHeicToJpeg } from '@/lib/heic-converter';
import {
  Upload,
  User,
  MapPin,
  Heart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Image as ImageIcon,
  UserPlus,
  UserCheck,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/upload-service';

interface OnboardingFlowProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface OnboardingProgress {
  profile_picture_added: boolean;
  background_image_added: boolean;
  bio_added: boolean;
  location_added: boolean;
  interests_added: boolean;
  completion_percentage: number;
  profile_completed: boolean;
}

const INTEREST_OPTIONS = [
  'Technology', 'Fashion', 'Food', 'Travel', 'Photography',
  'Art', 'Music', 'Sports', 'Gaming', 'Business',
  'Health', 'Education', 'Entertainment', 'DIY', 'Pets'
];

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  followers_count: number;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  // Form states
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Friend suggestions state
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);

  const totalSteps = 5;

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_onboarding_progress', {
        p_user_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setProgress(data[0]);
      }
    } catch (err) {
      console.error('Error fetching onboarding progress:', err);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Convert HEIC to JPEG if needed
      const convertedFile = await convertHeicToJpeg(file);

      if (convertedFile.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      setProfilePicture(convertedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(convertedFile);
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image');
    }
  };

  const handleBackgroundImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Convert HEIC to JPEG if needed
      const convertedFile = await convertHeicToJpeg(file);

      if (convertedFile.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      setBackgroundImage(convertedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);
      };
      reader.readAsDataURL(convertedFile);
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image');
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;

    try {
      setLoadingUsers(true);

      // Fetch users (excluding current user)
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, followers_count')
        .neq('id', user.id)
        .order('followers_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSuggestedUsers(data || []);
    } catch (err) {
      console.error('Error fetching suggested users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    if (followingInProgress.has(targetUserId)) {
      return; // Prevent double-clicking
    }

    try {
      setFollowingInProgress(prev => new Set(prev).add(targetUserId));

      const isFollowing = followingIds.has(targetUserId);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });

        toast.success('Unfollowed');
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;

        setFollowingIds(prev => new Set(prev).add(targetUserId));
        toast.success('Following!');
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      toast.error('Failed to update follow status');
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const getAvatarUrl = (userItem: SuggestedUser) => {
    return userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`;
  };

  const markStepComplete = async (stepName: string) => {
    if (!user) return;

    try {
      await supabase.rpc('mark_onboarding_step_complete', {
        p_user_id: user.id,
        p_step_name: stepName
      });
    } catch (err) {
      console.error('Error marking step complete:', err);
    }
  };

  const handleSaveStep1 = async () => {
    if (!profilePicture) {
      toast.error('Please select a profile picture');
      return;
    }

    try {
      setLoading(true);

      // Upload profile picture
      const profileUrl = await uploadImage(profilePicture, 'avatars');

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: profileUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Mark step complete
      await markStepComplete('profile_picture');

      toast.success('Profile picture updated!');
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error uploading profile picture:', err);
      toast.error('Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep2 = async () => {
    try {
      setLoading(true);

      let backgroundUrl = '';

      // Upload background image if provided
      if (backgroundImage) {
        backgroundUrl = await uploadImage(backgroundImage, 'backgrounds');
      }

      // Update user profile
      if (backgroundUrl) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ background_image_url: backgroundUrl })
          .eq('id', user?.id);

        if (updateError) throw updateError;

        await markStepComplete('background_image');
        toast.success('Background image updated!');
      }

      setCurrentStep(3);
    } catch (err: any) {
      console.error('Error uploading background image:', err);
      toast.error('Failed to upload background image');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    if (!bio.trim()) {
      toast.error('Please write something about yourself');
      return;
    }

    if (bio.length > 500) {
      toast.error('Bio must be less than 500 characters');
      return;
    }

    try {
      setLoading(true);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          bio: bio.trim(),
          location: location.trim() || null
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Mark steps complete
      await markStepComplete('bio');
      if (location.trim()) {
        await markStepComplete('location');
      }

      toast.success('Profile information updated!');
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep4 = async () => {
    if (selectedInterests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }

    try {
      setLoading(true);

      // Update user interests
      const { error: updateError } = await supabase
        .from('users')
        .update({
          interests: selectedInterests
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Mark step complete
      await markStepComplete('interests');

      toast.success('Interests saved!');

      // Fetch suggested users for next step
      await fetchSuggestedUsers();

      setCurrentStep(5);
    } catch (err: any) {
      console.error('Error saving interests:', err);
      toast.error('Failed to save interests');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep5 = async () => {
    try {
      setLoading(true);

      // Mark onboarding as complete
      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      toast.success('Welcome to LavLay! 🎉');

      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 1:
        handleSaveStep1();
        break;
      case 2:
        handleSaveStep2();
        break;
      case 3:
        handleSaveStep3();
        break;
      case 4:
        handleSaveStep4();
        break;
      case 5:
        handleSaveStep5();
        break;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    if (currentStep === 2) {
      // Skip background image - just go to next step
      setCurrentStep(3);
    } else if (currentStep === 5) {
      // Skip friend suggestions - complete onboarding
      handleSaveStep5();
    } else if (onSkip) {
      // Skip all - mark onboarding as complete
      try {
        if (user) {
          await supabase
            .from('users')
            .update({
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
      } catch (err) {
        console.error('Error marking onboarding as complete:', err);
      }
      onSkip();
    }
  };

  const progressPercentage = ((currentStep - 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl mb-1">Welcome to LavLay!</h2>
              <p className="text-sm text-gray-600">
                Complete your profile to get started
              </p>
            </div>
            {onSkip && (
              <Button variant="ghost" size="icon" onClick={onSkip}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step 1: Profile Picture */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl mb-2">Add a Profile Picture</h3>
                <p className="text-gray-600">
                  Help people recognize you with a great photo
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-32 h-32 border-4 border-purple-200">
                  <AvatarImage src={profilePicturePreview || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-3xl">
                    {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  id="profile-picture-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById('profile-picture-input')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Choose Photo
                </Button>

                <p className="text-xs text-gray-500">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Background Image */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <ImageIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl mb-2">Add a Cover Photo (Optional)</h3>
                <p className="text-gray-600">
                  Make your profile stand out with a cover image
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                  {backgroundImagePreview ? (
                    <img
                      src={backgroundImagePreview}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleBackgroundImageChange}
                  className="hidden"
                  id="background-image-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById('background-image-input')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Choose Cover Photo
                </Button>

                <p className="text-xs text-gray-500">
                  JPG, PNG or GIF. Max 10MB. Recommended: 1500x500px
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Bio and Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl mb-2">Tell Us About Yourself</h3>
                <p className="text-gray-600">
                  Share what makes you unique
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself, what you do, what you're passionate about..."
                    className="min-h-[120px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bio.length}/500 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Interests */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Heart className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl mb-2">What Are You Interested In?</h3>
                <p className="text-gray-600">
                  We'll use this to personalize your feed
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedInterests.includes(interest)
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{interest}</span>
                      {selectedInterests.includes(interest) && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-600 text-center">
                Selected {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Step 5: Follow Suggestions */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl mb-2">Find People to Follow</h3>
                <p className="text-gray-600">
                  Follow some accounts to build your feed
                </p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : suggestedUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No suggestions available yet. You can skip this step.
                  </p>
                ) : (
                  suggestedUsers.map((userItem) => {
                    const isFollowing = followingIds.has(userItem.id);
                    const isLoading = followingInProgress.has(userItem.id);

                    return (
                      <div
                        key={userItem.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={getAvatarUrl(userItem)} />
                            <AvatarFallback>
                              {(userItem.full_name || userItem.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {userItem.full_name || userItem.username}
                            </p>
                            <p className="text-sm text-gray-500">
                              @{userItem.username} · {userItem.followers_count || 0} followers
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isFollowing ? "default" : "outline"}
                          className={`gap-1 ${isFollowing ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                          onClick={() => handleFollow(userItem.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Follow
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-sm text-gray-600 text-center">
                Following {followingIds.size} {followingIds.size === 1 ? 'person' : 'people'}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-2">
              {(currentStep === 2 || currentStep === 5 || onSkip) && (
                <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                  Skip
                </Button>
              )}

              <Button onClick={handleNext} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentStep === totalSteps ? (
                  <>
                    Complete
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
