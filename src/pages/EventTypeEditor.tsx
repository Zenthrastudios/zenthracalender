import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypes, useCreateEventType, useUpdateEventType, EventType } from '@/hooks/useEventTypes';
import { useAvailability } from '@/hooks/useAvailability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ChevronRight, Video, Phone, MapPin, Globe, Clock, Calendar, Settings2, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DURATIONS = [15, 30, 45, 60, 90, 120];

const LOCATION_TYPES = [
  { value: 'google_meet', label: 'Google Meet', icon: Video },
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'in_person', label: 'In Person', icon: MapPin },
  { value: 'custom', label: 'Custom Link', icon: Globe },
];

const COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EventTypeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: eventTypes } = useEventTypes();
  const { data: availability } = useAvailability();
  const createEventType = useCreateEventType();
  const updateEventType = useUpdateEventType();
  
  const isNew = id === 'new';
  const existingEvent = eventTypes?.find(et => et.id === id);

  // Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [locationType, setLocationType] = useState('google_meet');
  const [locationValue, setLocationValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState('#3b82f6');

  // Advanced Settings
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(5);
  const [minimumNotice, setMinimumNotice] = useState(60);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setSlug(existingEvent.slug);
      setDescription(existingEvent.description || '');
      setDuration(existingEvent.duration);
      setLocationType(existingEvent.location_type);
      setLocationValue(existingEvent.location_value || '');
      setIsActive(existingEvent.is_active);
      setColor(existingEvent.color || '#3b82f6');
      setBufferBefore(existingEvent.buffer_before);
      setBufferAfter(existingEvent.buffer_after);
      setMinimumNotice(existingEvent.minimum_notice);
    }
  }, [existingEvent]);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  }, [title, isNew]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!slug.trim()) {
      toast.error('Please enter a URL slug');
      return;
    }

    setIsSubmitting(true);

    const finalDuration = DURATIONS.includes(duration) ? duration : parseInt(customDuration) || 30;

    const eventData = {
      title,
      slug,
      description: description || null,
      duration: finalDuration,
      buffer_before: bufferBefore,
      buffer_after: bufferAfter,
      location_type: locationType,
      location_value: locationValue || null,
      is_active: isActive,
      minimum_notice: minimumNotice,
      color,
    };

    try {
      if (isNew) {
        await createEventType.mutateAsync(eventData);
        toast.success('Event type created!');
      } else if (existingEvent) {
        await updateEventType.mutateAsync({ id: existingEvent.id, ...eventData });
        toast.success('Event type updated!');
      }
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving event type:', error);
      toast.error(error.message || 'Failed to save event type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  // Get availability for display
  const getAvailabilityByDay = () => {
    const byDay: Record<number, { start: number; end: number }[]> = {};
    availability?.forEach(a => {
      if (!byDay[a.weekday]) byDay[a.weekday] = [];
      byDay[a.weekday].push({ start: a.start_time, end: a.end_time });
    });
    return byDay;
  };

  const availabilityByDay = getAvailabilityByDay();

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground">Event Types</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{isNew ? 'Create New' : 'Edit'}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            {isNew ? 'New Event Type' : 'Edit Event Type'}
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isNew ? 'Create Event' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Instructor Profile Card */}
          <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Instructor Profile</h3>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{profile?.name || 'Your Name'}</p>
                <p className="text-sm text-muted-foreground">@{profile?.username || 'username'}</p>
                <p className="text-sm text-muted-foreground">{profile?.timezone || 'America/Los_Angeles'}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link to="/dashboard/settings">Edit Profile</Link>
              </Button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-6">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. 30 Minute Consultation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-2">
                    /{profile?.username || 'user'}/
                  </span>
                  <Input
                    id="slug"
                    placeholder="30-min-consultation"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this meeting is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background min-h-[100px]"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Event Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color === c.value ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Duration & Location */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Duration & Location</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDuration(d);
                        setCustomDuration('');
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        duration === d && !customDuration
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:bg-muted"
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value);
                        if (e.target.value) setDuration(0);
                      }}
                      className="w-20 h-8 bg-background"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={locationType} onValueChange={setLocationType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        <div className="flex items-center gap-2">
                          <loc.icon className="w-4 h-4" />
                          {loc.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(locationType === 'custom' || locationType === 'in_person') && (
              <div className="space-y-2">
                <Label>{locationType === 'custom' ? 'Meeting URL' : 'Location Address'}</Label>
                <Input
                  placeholder={locationType === 'custom' ? 'https://...' : 'Enter address...'}
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="bg-background"
                />
              </div>
            )}
          </div>

          {/* Availability Preview */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Linked Availability</h3>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/availability">Manage Availability</Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center">
              {DAYS.map((day, idx) => (
                <div key={day} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{day.slice(0, 3)}</p>
                  {availabilityByDay[idx] ? (
                    availabilityByDay[idx].map((slot, i) => (
                      <p key={i} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5">
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Unavailable</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <Accordion type="single" collapsible className="bg-card rounded-xl border border-border">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Advanced Settings</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Buffer Before (minutes)</Label>
                    <Select value={bufferBefore.toString()} onValueChange={(v) => setBufferBefore(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 30, 45, 60].map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Time blocked before meeting</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Buffer After (minutes)</Label>
                    <Select value={bufferAfter.toString()} onValueChange={(v) => setBufferAfter(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 30, 45, 60].map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Time blocked after meeting</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Notice (minutes)</Label>
                    <Select value={minimumNotice.toString()} onValueChange={(v) => setMinimumNotice(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 60, 120, 240, 480, 1440, 2880].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {m < 60 ? `${m} min` : m < 1440 ? `${m / 60} hours` : `${m / 1440} days`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How far in advance can bookings be made</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div>
              <p className="font-medium">Event active</p>
              <p className="text-sm text-muted-foreground">
                When disabled, this event type won't be visible on your public booking page
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}