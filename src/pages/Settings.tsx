import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Globe, Camera } from 'lucide-react';

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
  const { profile, user, updateProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
      setTimezone(profile.timezone || 'America/Los_Angeles');
    }
  }, [profile]);

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
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Upload a profile picture to personalize your booking page.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, at least 200x200px
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
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