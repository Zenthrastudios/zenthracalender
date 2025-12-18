import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypes, useCreateEventType, useUpdateEventType, EventType } from '@/hooks/useEventTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Plus, X, Video, Phone, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DURATIONS = [15, 30, 45, 60];

const LOCATION_TYPES = [
  { value: 'google_meet', label: 'Google Meet', icon: Video },
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'in_person', label: 'In Person', icon: MapPin },
  { value: 'custom', label: 'Custom Link', icon: Globe },
];

export default function EventTypeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: eventTypes } = useEventTypes();
  const createEventType = useCreateEventType();
  const updateEventType = useUpdateEventType();
  
  const isNew = id === 'new';
  const existingEvent = eventTypes?.find(et => et.id === id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [locationType, setLocationType] = useState('google_meet');
  const [locationValue, setLocationValue] = useState('');
  const [isActive, setIsActive] = useState(true);
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
      buffer_before: 5,
      buffer_after: 5,
      location_type: locationType,
      location_value: locationValue || null,
      is_active: isActive,
      minimum_notice: 60,
      color: null,
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
        <div className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. 15 Minute Discovery"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-card"
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
                  placeholder="15-min-discovery"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-card"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Write a short description about this meeting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card min-h-[120px]"
            />
          </div>

          {/* Duration & Location */}
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
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      duration === d && !customDuration
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border hover:bg-muted"
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
                    className="w-20 h-10 bg-card"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="bg-card">
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
