import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, startOfDay } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  useAvailabilitySchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useScheduleAvailability,
  useUpdateScheduleAvailability
} from '@/hooks/useAvailabilitySchedules';
import {
  useAvailabilityOverrides,
  useCreateAvailabilityOverride,
  useDeleteAvailabilityOverride,
} from '@/hooks/useAvailabilityOverrides';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
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

  // Date overrides
  const { data: overrides, isLoading: overridesLoading } = useAvailabilityOverrides();
  const createOverride = useCreateAvailabilityOverride();
  const deleteOverride = useDeleteAvailabilityOverride();

  const [dateOverrideOpen, setDateOverrideOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [overrideStart, setOverrideStart] = useState<string>("540"); // 9:00 AM
  const [overrideEnd, setOverrideEnd] = useState<string>("1020");   // 5:00 PM
  const [isDateUnavailable, setIsDateUnavailable] = useState(false);

  const handleCreateOverride = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      await createOverride.mutateAsync({
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: isDateUnavailable ? null : parseInt(overrideStart),
        end_time: isDateUnavailable ? null : parseInt(overrideEnd),
        is_unavailable: isDateUnavailable
      });
      setDateOverrideOpen(false);
      // Don't reset date to allow easy addition of more
      toast.success('Date override set');
    } catch (e: any) {
      toast.error(e.message || 'Failed to set override');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = overrides?.find(o => o.date === dateStr);
      if (existing) {
        setIsDateUnavailable(existing.is_unavailable);
        if (existing.start_time) setOverrideStart(existing.start_time.toString());
        if (existing.end_time) setOverrideEnd(existing.end_time.toString());
      } else {
        // Reset to defaults
        setIsDateUnavailable(false);
        setOverrideStart("540");
        setOverrideEnd("1020");
      }
    }
  };

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
          {/* Schedule Selector */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Availability Schedules</h3>
              </div>
              <Dialog open={newScheduleDialogOpen} onOpenChange={setNewScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Schedule</DialogTitle>
                    <DialogDescription>
                      Create a new availability schedule that you can assign to different event types.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Schedule Name</Label>
                      <Input
                        placeholder="e.g. Evening Hours, Weekend Only"
                        value={newScheduleName}
                        onChange={(e) => setNewScheduleName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewScheduleDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSchedule} disabled={createSchedule.isPending}>
                      {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Schedule Tabs */}
            <div className="flex flex-wrap gap-2">
              {schedules?.map((schedule) => (
                <div
                  key={schedule.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    selectedScheduleId === schedule.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                  onClick={() => setSelectedScheduleId(schedule.id)}
                >
                  <span className="text-sm font-medium">{schedule.name}</span>
                  {schedule.is_default && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Default</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingSchedule({ id: schedule.id, name: schedule.name })}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {!schedule.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(schedule.id)}>
                          <Check className="w-4 h-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      {schedules.length > 1 && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>

            {/* Rename Dialog */}
            <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename Schedule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Schedule Name</Label>
                    <Input
                      value={editingSchedule?.name || ''}
                      onChange={(e) => setEditingSchedule(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
                  <Button onClick={handleUpdateScheduleName} disabled={updateScheduleMutation.isPending}>
                    {updateScheduleMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">
                {selectedSchedule?.name || 'Weekly Schedule'}
              </h3>
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

          {/* Date-specific hours */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Date-specific hours</h3>
              </div>
              <Dialog open={dateOverrideOpen} onOpenChange={setDateOverrideOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Date Override
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Date Override</DialogTitle>
                    <DialogDescription>
                      Select a date to customize your availability or mark as unavailable.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex justify-center">
                      <CalendarPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        className="rounded-xl border border-border shadow-sm p-4"
                        disabled={(date) => isBefore(date, startOfDay(new Date()))}
                      />
                    </div>
                    {selectedDate && (
                      <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">Mark as unavailable</Label>
                          <Switch
                            checked={isDateUnavailable}
                            onCheckedChange={setIsDateUnavailable}
                          />
                        </div>
                        {!isDateUnavailable && (
                          <div className="flex items-center gap-2">
                            <Select value={overrideStart} onValueChange={setOverrideStart}>
                              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">-</span>
                            <Select value={overrideEnd} onValueChange={setOverrideEnd}>
                              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.filter(o => parseInt(o.value.toString()) > parseInt(overrideStart)).map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateOverride} className="w-full sm:w-auto">Save Override</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {overrides?.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No date-specific overrides set.</p>
              )}
              {overrides?.map((override) => (
                <div key={override.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 hover:bg-background transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {format(new Date(override.date), 'd')}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {format(new Date(override.date), 'MMMM yyyy')}
                      </span>
                      <span className={cn("text-xs", override.is_unavailable ? "text-destructive" : "text-muted-foreground")}>
                        {override.is_unavailable
                          ? 'Unavailable'
                          : `${formatTime(override.start_time!)} - ${formatTime(override.end_time!)}`
                        }
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteOverride.mutate(override.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}