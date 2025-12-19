import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAvailability, useUpdateAvailability } from '@/hooks/useAvailability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Copy, Calendar, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const totalMinutes = hours * 60 + minutes;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return {
    value: totalMinutes,
    label: `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`,
  };
});

interface DaySchedule {
  enabled: boolean;
  slots: { start: number; end: number }[];
}

export default function Availability() {
  const { data: availability, isLoading } = useAvailability();
  const updateAvailability = useUpdateAvailability();
  
  // Schedule state
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
  
  // Advanced settings
  const [bookingPeriod, setBookingPeriod] = useState(60); // days in advance
  const [minimumNotice, setMinimumNotice] = useState(60); // minutes
  const [slotIncrement, setSlotIncrement] = useState(30); // minutes
  const [dailyLimit, setDailyLimit] = useState(0); // 0 = unlimited
  
  const [isSaving, setIsSaving] = useState(false);

  // Initialize schedule from availability data
  useEffect(() => {
    if (availability) {
      const newSchedule: Record<number, DaySchedule> = {};
      
      DAYS.forEach(day => {
        const daySlots = availability.filter(a => a.weekday === day.value);
        newSchedule[day.value] = {
          enabled: daySlots.length > 0,
          slots: daySlots.length > 0 
            ? daySlots.map(s => ({ start: s.start_time, end: s.end_time }))
            : [{ start: 540, end: 1020 }], // Default 9am-5pm
        };
      });
      
      setSchedule(newSchedule);
    }
  }, [availability]);

  const toggleDay = (dayValue: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        enabled: !prev[dayValue]?.enabled,
        slots: prev[dayValue]?.slots || [{ start: 540, end: 1020 }],
      },
    }));
  };

  const addSlot = (dayValue: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: [...(prev[dayValue]?.slots || []), { start: 540, end: 1020 }],
      },
    }));
  };

  const removeSlot = (dayValue: number, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue]?.slots.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const updateSlot = (dayValue: number, index: number, field: 'start' | 'end', value: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue]?.slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ) || [],
      },
    }));
  };

  const copyToWeekdays = (sourceDayValue: number) => {
    const sourceDay = schedule[sourceDayValue];
    if (!sourceDay) return;

    const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
    setSchedule(prev => {
      const updated = { ...prev };
      weekdays.forEach(day => {
        updated[day] = {
          enabled: sourceDay.enabled,
          slots: [...sourceDay.slots],
        };
      });
      return updated;
    });
    toast.success('Copied to all weekdays');
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const newAvailability: { weekday: number; start_time: number; end_time: number }[] = [];
      
      Object.entries(schedule).forEach(([day, daySchedule]) => {
        if (daySchedule.enabled) {
          daySchedule.slots.forEach(slot => {
            newAvailability.push({
              weekday: parseInt(day),
              start_time: slot.start,
              end_time: slot.end,
            });
          });
        }
      });

      await updateAvailability.mutateAsync(newAvailability);
      toast.success('Availability saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading availability...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Availability</h1>
            <p className="text-muted-foreground">Set your weekly hours when you're available for bookings</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Weekly Schedule */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Weekly Schedule</h3>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const daySchedule = schedule[day.value];
                const isEnabled = daySchedule?.enabled || false;

                return (
                  <div
                    key={day.value}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      isEnabled ? "bg-background border-border" : "bg-muted/30 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className={cn(
                        "w-24 font-medium",
                        !isEnabled && "text-muted-foreground"
                      )}>
                        {day.label}
                      </span>

                      {isEnabled ? (
                        <div className="flex-1 space-y-2">
                          {daySchedule?.slots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={slot.start.toString()}
                                onValueChange={(v) => updateSlot(day.value, index, 'start', parseInt(v))}
                              >
                                <SelectTrigger className="w-32 bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value.toString()}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-muted-foreground">to</span>
                              <Select
                                value={slot.end.toString()}
                                onValueChange={(v) => updateSlot(day.value, index, 'end', parseInt(v))}
                              >
                                <SelectTrigger className="w-32 bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.filter(opt => opt.value > slot.start).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value.toString()}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {daySchedule.slots.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSlot(day.value, index)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                              
                              {index === daySchedule.slots.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => addSlot(day.value)}
                                  className="h-8 w-8"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}

                      {isEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToWeekdays(day.value)}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy to weekdays
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Booking Period</Label>
                    <Select value={bookingPeriod.toString()} onValueChange={(v) => setBookingPeriod(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[7, 14, 30, 60, 90, 180, 365].map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d} days in advance
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How far in advance can people book</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Notice</Label>
                    <Select value={minimumNotice.toString()} onValueChange={(v) => setMinimumNotice(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 30, 60, 120, 240, 480, 1440].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {m === 0 ? 'No minimum' : m < 60 ? `${m} minutes` : m < 1440 ? `${m / 60} hours` : `${m / 1440} day(s)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Minimum time before a booking can start</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Slot Increment</Label>
                    <Select value={slotIncrement.toString()} onValueChange={(v) => setSlotIncrement(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[15, 30, 60].map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m} minutes</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Available time slots will start at these intervals</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Daily Booking Limit</Label>
                    <Select value={dailyLimit.toString()} onValueChange={(v) => setDailyLimit(parseInt(v))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 10].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n === 0 ? 'Unlimited' : `${n} bookings per day`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Maximum number of bookings per day</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Quick Preview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Weekly Overview</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const daySchedule = schedule[day.value];
                const isEnabled = daySchedule?.enabled || false;

                return (
                  <div
                    key={day.value}
                    className={cn(
                      "p-3 rounded-lg text-center",
                      isEnabled ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    <p className={cn(
                      "text-sm font-medium mb-1",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )}>
                      {day.short}
                    </p>
                    {isEnabled ? (
                      <div className="space-y-1">
                        {daySchedule?.slots.map((slot, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {formatTime(slot.start)}<br />
                            {formatTime(slot.end)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Off</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}