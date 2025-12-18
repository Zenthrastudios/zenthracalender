import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useScheduling } from '@/contexts/SchedulingContext';
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
import { EventType, Availability } from '@/types/scheduling';
import { v4 as uuidv4 } from 'uuid';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DURATIONS = [15, 30, 45, 60];

const LOCATION_TYPES = [
  { value: 'google_meet', label: 'Google Meet', icon: Video },
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'in_person', label: 'In Person', icon: MapPin },
  { value: 'custom', label: 'Custom Link', icon: Globe },
];

interface TimeBlock {
  id: string;
  startTime: number;
  endTime: number;
}

interface DayAvailability {
  enabled: boolean;
  blocks: TimeBlock[];
}

export default function EventTypeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { eventTypes, addEventType, updateEventType, availability, user } = useScheduling();
  
  const isNew = id === 'new';
  const existingEvent = eventTypes.find(et => et.id === id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [locationType, setLocationType] = useState<EventType['locationType']>('google_meet');
  const [locationValue, setLocationValue] = useState('');
  
  // Availability state
  const [dayAvailability, setDayAvailability] = useState<Record<number, DayAvailability>>({
    0: { enabled: false, blocks: [] },
    1: { enabled: true, blocks: [{ id: '1', startTime: 540, endTime: 1020 }] },
    2: { enabled: true, blocks: [{ id: '2', startTime: 540, endTime: 1020 }] },
    3: { enabled: true, blocks: [{ id: '3', startTime: 540, endTime: 1020 }] },
    4: { enabled: true, blocks: [{ id: '4', startTime: 540, endTime: 1020 }] },
    5: { enabled: true, blocks: [{ id: '5', startTime: 540, endTime: 1020 }] },
    6: { enabled: false, blocks: [] },
  });

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setSlug(existingEvent.slug);
      setDescription(existingEvent.description || '');
      setDuration(existingEvent.duration);
      setLocationType(existingEvent.locationType);
      setLocationValue(existingEvent.locationValue || '');
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, mins] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + mins;
    if (period === 'PM' && hours !== 12) totalMinutes += 720;
    if (period === 'AM' && hours === 12) totalMinutes -= 720;
    return totalMinutes;
  };

  const toggleDay = (day: number) => {
    setDayAvailability(prev => ({
      ...prev,
      [day]: {
        enabled: !prev[day].enabled,
        blocks: !prev[day].enabled ? [{ id: uuidv4(), startTime: 540, endTime: 1020 }] : []
      }
    }));
  };

  const addTimeBlock = (day: number) => {
    setDayAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: [...prev[day].blocks, { id: uuidv4(), startTime: 540, endTime: 1020 }]
      }
    }));
  };

  const removeTimeBlock = (day: number, blockId: string) => {
    setDayAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.filter(b => b.id !== blockId)
      }
    }));
  };

  const updateTimeBlock = (day: number, blockId: string, field: 'startTime' | 'endTime', value: number) => {
    setDayAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.map(b => 
          b.id === blockId ? { ...b, [field]: value } : b
        )
      }
    }));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const finalDuration = DURATIONS.includes(duration) ? duration : parseInt(customDuration) || 30;

    const eventData: Omit<EventType, 'id' | 'userId'> = {
      title,
      slug,
      description,
      duration: finalDuration,
      bufferBefore: 5,
      bufferAfter: 5,
      locationType,
      locationValue,
      isActive: true,
      minimumNotice: 60,
    };

    if (isNew) {
      addEventType(eventData);
      toast.success('Event type created!');
    } else if (existingEvent) {
      updateEventType(existingEvent.id, eventData);
      toast.success('Event type updated!');
    }

    navigate('/dashboard');
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
            <Button onClick={handleSubmit}>
              {isNew ? 'Create Event' : 'Save Changes'}
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
                  {user?.username || 'alex'}.cal.com/
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
                    onClick={() => setDuration(d)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      duration === d
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
              <Select value={locationType} onValueChange={(v) => setLocationType(v as EventType['locationType'])}>
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

          {/* Availability */}
          <div className="border-t border-border pt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Availability</h2>
                <p className="text-sm text-muted-foreground">Set your weekly recurring schedule.</p>
              </div>
              <button className="text-sm text-primary hover:underline font-medium">
                Copy from...
              </button>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <Switch
                    checked={dayAvailability[day].enabled}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <span className="w-12 text-sm font-medium">{DAYS[day]}</span>
                  
                  {dayAvailability[day].enabled ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      {dayAvailability[day].blocks.map((block) => (
                        <div key={block.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                          <Input
                            type="time"
                            value={`${Math.floor(block.startTime / 60).toString().padStart(2, '0')}:${(block.startTime % 60).toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number);
                              updateTimeBlock(day, block.id, 'startTime', h * 60 + m);
                            }}
                            className="w-28 h-8 bg-card text-sm"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={`${Math.floor(block.endTime / 60).toString().padStart(2, '0')}:${(block.endTime % 60).toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number);
                              updateTimeBlock(day, block.id, 'endTime', h * 60 + m);
                            }}
                            className="w-28 h-8 bg-card text-sm"
                          />
                          <button
                            onClick={() => removeTimeBlock(day, block.id)}
                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addTimeBlock(day)}
                        className="p-2 rounded-full bg-accent hover:bg-accent/80 text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
