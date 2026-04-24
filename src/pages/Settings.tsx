import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/contexts/BrandContext';
import { useUploadAvatar } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Globe, Camera, Loader2, Moon, Sun, Monitor, Palette, Check } from 'lucide-react';

// Available accent colors with their CSS variable values
const ACCENT_COLORS = [
  { name: 'Orange', value: 'orange', light: { primary: '30 95% 50%', accent: '30 80% 97%' }, dark: { primary: '38 95% 55%', accent: '0 0% 12%' } },
  { name: 'Blue', value: 'blue', light: { primary: '210 95% 55%', accent: '210 80% 97%' }, dark: { primary: '210 95% 60%', accent: '0 0% 12%' } },
  { name: 'Purple', value: 'purple', light: { primary: '270 75% 55%', accent: '270 60% 97%' }, dark: { primary: '270 80% 65%', accent: '0 0% 12%' } },
  { name: 'Green', value: 'green', light: { primary: '155 75% 42%', accent: '155 60% 97%' }, dark: { primary: '155 75% 50%', accent: '0 0% 12%' } },
  { name: 'Pink', value: 'pink', light: { primary: '330 80% 55%', accent: '330 60% 97%' }, dark: { primary: '330 80% 65%', accent: '0 0% 12%' } },
  { name: 'Red', value: 'red', light: { primary: '0 80% 55%', accent: '0 60% 97%' }, dark: { primary: '0 80% 60%', accent: '0 0% 12%' } },
  { name: 'Teal', value: 'teal', light: { primary: '175 70% 45%', accent: '175 50% 97%' }, dark: { primary: '175 70% 55%', accent: '0 0% 12%' } },
  { name: 'Indigo', value: 'indigo', light: { primary: '235 80% 55%', accent: '235 60% 97%' }, dark: { primary: '235 80% 65%', accent: '0 0% 12%' } },
];

// Local storage key for accent color
const ACCENT_COLOR_KEY = 'app-accent-color';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function Settings() {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [accentColor, setAccentColor] = useState('pink');
  const { brandName, setBrandName } = useBrand();

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
      setTimezone(profile.timezone || 'America/Los_Angeles');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Load saved accent color from localStorage
  useEffect(() => {
    const savedColor = localStorage.getItem(ACCENT_COLOR_KEY) || 'pink';
    setAccentColor(savedColor);
    applyAccentColor(savedColor);
  }, []);

  // Apply accent color to CSS variables
  const applyAccentColor = (colorValue: string) => {
    const color = ACCENT_COLORS.find(c => c.value === colorValue);
    if (!color) return;

    const root = document.documentElement;
    // Light mode values
    root.style.setProperty('--primary', color.light.primary);
    root.style.setProperty('--accent', color.light.accent);
    // Dark mode values (applied via class)
    if (document.documentElement.classList.contains('dark')) {
      root.style.setProperty('--primary', color.dark.primary);
      root.style.setProperty('--accent', color.dark.accent);
    }
  };

  const handleAccentColorChange = (colorValue: string) => {
    setAccentColor(colorValue);
    localStorage.setItem(ACCENT_COLOR_KEY, colorValue);
    applyAccentColor(colorValue);
    toast.success(`Accent color changed to ${ACCENT_COLORS.find(c => c.value === colorValue)?.name}`);
  };

  const handleBrandNameChange = (name: string) => {
    setBrandName(name);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      await uploadAvatar.mutateAsync({ userId: user.id, file });
      await refreshProfile?.();
      toast.success('Profile photo updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({
        name,
        username,
        timezone,
        phone,
      });
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Profile Picture</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a profile picture.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, at least 200x200px (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <h3 className="font-semibold">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-2">@</span>
                  <Input
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your booking URL: yoursite.com/{username}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">Used for WhatsApp notifications</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell people a bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-background min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">This will appear on your public booking page</p>
            </div>
          </div>

          {/* Timezone */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Timezone</h3>
            </div>

            <div className="space-y-2">
              <Label>Your Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All times in your availability and bookings will be shown in this timezone
              </p>
            </div>
          </div>

          {/* Brand Name */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Brand Name</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandName">Your Brand Name</Label>
              <Input
                id="brandName"
                placeholder="Enter your brand name"
                value={brandName}
                onChange={(e) => handleBrandNameChange(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                This name will be displayed throughout the app (e.g., in headers, titles)
              </p>
            </div>
          </div>

          {/* Accent Color */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Accent Color</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose the primary accent color for buttons and highlights throughout the app
            </p>
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentColorChange(color.value)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    accentColor === color.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-md"
                    style={{
                      backgroundColor: `hsl(${color.light.primary})`,
                    }}
                  />
                  <span className="text-xs font-medium">{color.name}</span>
                  {accentColor === color.value && (
                    <Check className="absolute top-1 right-1 w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Settings */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Appearance</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 bg-card rounded-xl border border-destructive/50 space-y-4">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
