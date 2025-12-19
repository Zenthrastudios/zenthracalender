import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  useAvailabilitySchedules, 
  useCreateSchedule, 
  useUpdateSchedule,
  useDeleteSchedule,
  useScheduleAvailability, 
  useUpdateScheduleAvailability 
} from '@/hooks/useAvailabilitySchedules';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Copy, Calendar, Settings2, Check, MoreVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { data: schedules, isLoading: schedulesLoading } = useAvailabilitySchedules();
  const createSchedule = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const updateScheduleAvailability = useUpdateScheduleAvailability();
  
  // Selected schedule
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  
  // Schedule availability data
  const { data: scheduleAvailability, isLoading: availabilityLoading } = useScheduleAvailability(selectedScheduleId);
  
  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>({});
  
  // New schedule dialog
  const [newScheduleDialogOpen, setNewScheduleDialogOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [editingSchedule, setEditingSchedule] = useState<{ id: string; name: string } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first schedule or default
  useEffect(() => {
    if (schedules && schedules.length > 0 && !selectedScheduleId) {
      const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
      setSelectedScheduleId(defaultSchedule.id);
    }
  }, [schedules, selectedScheduleId]);

  // Initialize weekly schedule from availability data
  useEffect(() => {
    if (scheduleAvailability) {
      const newSchedule: Record<number, DaySchedule> = {};
      
      DAYS.forEach(day => {
        const daySlots = scheduleAvailability.filter(a => a.weekday === day.value);
        newSchedule[day.value] = {
          enabled: daySlots.length > 0,
          slots: daySlots.length > 0 
            ? daySlots.map(s => ({ start: s.start_time, end: s.end_time }))
            : [{ start: 540, end: 1020 }],
        };
      });
      
      setWeeklySchedule(newSchedule);
    }
  }, [scheduleAvailability]);

  const toggleDay = (dayValue: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        enabled: !prev[dayValue]?.enabled,
        slots: prev[dayValue]?.slots || [{ start: 540, end: 1020 }],
      },
    }));
  };

  const addSlot = (dayValue: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: [...(prev[dayValue]?.slots || []), { start: 540, end: 1020 }],
      },
    }));
  };

  const removeSlot = (dayValue: number, index: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue]?.slots.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const updateSlot = (dayValue: number, index: number, field: 'start' | 'end', value: number) => {
    setWeeklySchedule(prev => ({
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
    const sourceDay = weeklySchedule[sourceDayValue];
    if (!sourceDay) return;

    const weekdays = [1, 2, 3, 4, 5];
    setWeeklySchedule(prev => {
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
    if (!selectedScheduleId) return;
    
    setIsSaving(true);
    
    try {
      const slots: { weekday: number; start_time: number; end_time: number }[] = [];
      
      Object.entries(weeklySchedule).forEach(([day, daySchedule]) => {
        if (daySchedule.enabled) {
          daySchedule.slots.forEach(slot => {
            slots.push({
              weekday: parseInt(day),
              start_time: slot.start,
              end_time: slot.end,
            });
          });
        }
      });

      await updateScheduleAvailability.mutateAsync({ scheduleId: selectedScheduleId, slots });
      toast.success('Availability saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      toast.error('Please enter a schedule name');
      return;
    }
    
    try {
      const newSchedule = await createSchedule.mutateAsync({ name: newScheduleName.trim() });
      setSelectedScheduleId(newSchedule.id);
      setNewScheduleName('');
      setNewScheduleDialogOpen(false);
      toast.success('Schedule created!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule');
    }
  };

  const handleUpdateScheduleName = async () => {
    if (!editingSchedule || !editingSchedule.name.trim()) return;
    
    try {
      await updateScheduleMutation.mutateAsync({ id: editingSchedule.id, name: editingSchedule.name.trim() });
      setEditingSchedule(null);
      toast.success('Schedule renamed!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename schedule');
    }
  };

  const handleSetDefault = async (scheduleId: string) => {
    try {
      await updateScheduleMutation.mutateAsync({ id: scheduleId, isDefault: true });
      toast.success('Default schedule updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId);
      if (selectedScheduleId === scheduleId) {
        const remaining = schedules?.filter(s => s.id !== scheduleId);
        if (remaining && remaining.length > 0) {
          setSelectedScheduleId(remaining[0].id);
        }
      }
      toast.success('Schedule deleted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const selectedSchedule = schedules?.find(s => s.id === selectedScheduleId);
  const isLoading = schedulesLoading || availabilityLoading;

  if (schedulesLoading) {
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
      <div className="px-4 py-6 sm:p-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Availability</h1>
            <p className="text-sm text-muted-foreground">Set your weekly hours when you're available for bookings</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Weekly Schedule */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Weekly Schedule</h3>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const daySchedule = weeklySchedule[day.value];
                const isEnabled = daySchedule?.enabled || false;

                return (
                  <div
                    key={day.value}
                    className={cn(
                      "p-3 sm:p-4 rounded-lg border transition-colors",
                      isEnabled ? "bg-background border-border" : "bg-muted/30 border-transparent"
                    )}
                  >
                    {/* Day header row: switch + name + copy button (on larger screens) */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleDay(day.value)}
                        />
                        <span className={cn(
                          "font-medium text-sm sm:text-base",
                          !isEnabled && "text-muted-foreground"
                        )}>
                          {day.label}
                        </span>
                      </div>

                      {!isEnabled && (
                        <span className="text-sm text-muted-foreground">Unavailable</span>
                      )}

                      {/* Copy button - hidden on mobile, shown on sm+ inline */}
                      {isEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToWeekdays(day.value)}
                          className="hidden sm:inline-flex text-xs h-8"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy to weekdays
                        </Button>
                      )}
                    </div>

                    {/* Time slots - stacked below on mobile */}
                    {isEnabled && (
                      <div className="mt-3 space-y-2">
                        {daySchedule?.slots.map((slot, index) => (
                          <div key={index} className="flex flex-wrap items-center gap-2">
                            <Select
                              value={slot.start.toString()}
                              onValueChange={(v) => updateSlot(day.value, index, 'start', parseInt(v))}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[120px] bg-background text-sm">
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
                            <span className="text-muted-foreground text-sm">to</span>
                            <Select
                              value={slot.end.toString()}
                              onValueChange={(v) => updateSlot(day.value, index, 'end', parseInt(v))}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[120px] bg-background text-sm">
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

                            <div className="flex items-center gap-1 ml-auto sm:ml-0">
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
                          </div>
                        ))}

                        {/* Copy button on mobile - shown below slots */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToWeekdays(day.value)}
                          className="sm:hidden text-xs h-8 w-full justify-center mt-1"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy to weekdays
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Preview */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Weekly Overview</h3>
            </div>
            {/* Mobile: horizontal scroll, Desktop: grid */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-7 sm:overflow-visible">
              {DAYS.map((day) => {
                const daySchedule = weeklySchedule[day.value];
                const isEnabled = daySchedule?.enabled || false;

                return (
                  <div
                    key={day.value}
                    className={cn(
                      "flex-shrink-0 w-[72px] sm:w-auto p-2 sm:p-3 rounded-lg text-center",
                      isEnabled ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    <p className={cn(
                      "text-xs sm:text-sm font-medium mb-1",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )}>
                      {day.short}
                    </p>
                    {isEnabled ? (
                      <div className="space-y-0.5 sm:space-y-1">
                        {daySchedule?.slots.map((slot, i) => (
                          <p key={i} className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                            {formatTime(slot.start)}<br />
                            {formatTime(slot.end)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Off</p>
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