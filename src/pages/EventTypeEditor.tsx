import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypes, useCreateEventType, useUpdateEventType, useDeleteEventType, EventType } from '@/hooks/useEventTypes';
import { useAvailabilitySchedules, useScheduleAvailability } from '@/hooks/useAvailabilitySchedules';
import { useInstructors } from '@/hooks/useInstructors';
import { useTestimonials, useCreateTestimonial, useUpdateTestimonial, useDeleteTestimonial, Testimonial } from '@/hooks/useTestimonials';
import type { TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/dialog';
import {
  ChevronRight, Video, Phone, MapPin, Globe, Clock, Calendar,
  Settings2, User, Plus, Trash2, GripVertical, FileText, IndianRupee, CreditCard, GraduationCap, Star, Eye, EyeOff, Edit
} from 'lucide-react';
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

const PAYMENT_PROVIDERS = [
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'cashfree', label: 'Cashfree' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
}

interface TestimonialFormState {
  id?: string;
  author_name: string;
  author_title: string;
  avatar_url: string;
  rating: string;
  content: string;
  sort_order: string;
  is_visible: boolean;
}

type SocialLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  pinterest?: string;
};

export default function EventTypeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: eventTypes } = useEventTypes();
  const { data: schedules } = useAvailabilitySchedules();
  const { data: instructors } = useInstructors();
  const createEventType = useCreateEventType();
  const updateEventType = useUpdateEventType();
  const deleteEventType = useDeleteEventType();

  const isNew = id === 'new';
  const existingEvent = eventTypes?.find(et => et.id === id);

  // Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');

  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [locationType, setLocationType] = useState('google_meet');
  const [locationValue, setLocationValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState('#3b82f6');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Advanced Settings
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(5);
  const [minimumNotice, setMinimumNotice] = useState(60);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [reschedulePrice, setReschedulePrice] = useState(0);

  // Custom Form Fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Payment Settings
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<string>('razorpay');

  // Instructor Assignment
  const [instructorId, setInstructorId] = useState<string | null>(null);

  // Testimonials
  const [showTestimonials, setShowTestimonials] = useState(true);
  const { data: testimonials } = useTestimonials(isNew ? undefined : existingEvent?.id, { includeHidden: true });
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();
  const [isTestimonialDialogOpen, setIsTestimonialDialogOpen] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialFormState>({
    author_name: '',
    author_title: '',
    avatar_url: '',
    rating: '5',
    content: '',
    sort_order: '0',
    is_visible: true,
  });

  // Schedule Assignment
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [isTestimonialAvatarUploading, setIsTestimonialAvatarUploading] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const testimonialAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const [testimonialAvatarFile, setTestimonialAvatarFile] = useState<File | null>(null);
  const lastFieldRef = useRef<HTMLDivElement>(null);

  // Get availability for selected schedule
  const { data: scheduleAvailability } = useScheduleAvailability(scheduleId);

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setSlug(existingEvent.slug);
      setDescription(existingEvent.description || '');
      setBannerImageUrl(existingEvent.banner_image_url || '');
      setDuration(existingEvent.duration);
      setLocationType(existingEvent.location_type);
      setLocationValue(existingEvent.location_value || '');
      setIsActive(existingEvent.is_active);
      setColor(existingEvent.color || '#3b82f6');
      setBufferBefore(existingEvent.buffer_before);
      setBufferAfter(existingEvent.buffer_after);
      setMinimumNotice(existingEvent.minimum_notice);
      // @ts-ignore
      setAllowRescheduling(existingEvent.allow_rescheduling ?? true);
      // @ts-ignore
      setReschedulePrice(existingEvent.reschedule_price ?? 0);
      // Load custom fields if they exist
      if (Array.isArray(existingEvent.custom_fields)) {
        setCustomFields(existingEvent.custom_fields as unknown as CustomField[]);
      }
      // Load payment settings
      setIsPaid(!!existingEvent.is_paid);
      setPrice(existingEvent.price?.toString() || '');
      setPaymentProvider(existingEvent.payment_provider || 'razorpay');
      // Load instructor assignment
      setInstructorId(existingEvent.instructor_id || null);
      // Load schedule assignment
      setScheduleId(existingEvent.schedule_id || null);
      setShowTestimonials(existingEvent.show_testimonials ?? true);

      const incomingSocialLinks = existingEvent.social_links;
      if (incomingSocialLinks && typeof incomingSocialLinks === 'object' && !Array.isArray(incomingSocialLinks)) {
        setSocialLinks(incomingSocialLinks as unknown as SocialLinks);
      } else {
        setSocialLinks({});
      }
    }
  }, [existingEvent]);

  const openCreateTestimonial = () => {
    setTestimonialForm({
      author_name: '',
      author_title: '',
      avatar_url: '',
      rating: '5',
      content: '',
      sort_order: '0',
      is_visible: true,
    });
    setTestimonialAvatarFile(null);
    setIsTestimonialDialogOpen(true);
  };

  const openEditTestimonial = (t: Testimonial) => {
    setTestimonialForm({
      id: t.id,
      author_name: t.author_name,
      author_title: t.author_title || '',
      avatar_url: t.avatar_url || '',
      rating: t.rating ? String(t.rating) : '',
      content: t.content,
      sort_order: String(t.sort_order ?? 0),
      is_visible: t.is_visible,
    });
    setTestimonialAvatarFile(null);
    setIsTestimonialDialogOpen(true);
  };

  const uploadPublicImage = async (folder: string, file: File) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('public-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsBannerUploading(true);
    try {
      const ownerId = profile?.user_id || 'unknown';
      const url = await uploadPublicImage(`event-banners/${ownerId}`, file);
      setBannerImageUrl(url);
      toast.success('Banner image uploaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload banner image';
      toast.error(message);
    } finally {
      setIsBannerUploading(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const submitTestimonial = async () => {

    if (isNew || !existingEvent?.id) {
      toast.error('Please create the event type first');
      return;
    }

    if (!testimonialForm.author_name.trim()) {
      toast.error('Please enter author name');
      return;
    }
    if (!testimonialForm.content.trim()) {
      toast.error('Please enter testimonial');
      return;
    }

    const rating = testimonialForm.rating.trim() === '' ? null : Math.max(1, Math.min(5, parseInt(testimonialForm.rating, 10) || 5));
    const sortOrder = parseInt(testimonialForm.sort_order, 10);

    try {
      if (testimonialForm.id) {
        let avatarUrl: string | null = testimonialForm.avatar_url ? testimonialForm.avatar_url : null;
        if (testimonialAvatarFile) {
          setIsTestimonialAvatarUploading(true);
          avatarUrl = await uploadPublicImage(`testimonials/${testimonialForm.id}`, testimonialAvatarFile);
        }

        await updateTestimonial.mutateAsync({
          id: testimonialForm.id,
          author_name: testimonialForm.author_name,
          author_title: testimonialForm.author_title || null,
          avatar_url: avatarUrl,
          rating,
          content: testimonialForm.content,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          is_visible: testimonialForm.is_visible,
        });
        toast.success('Testimonial updated');
      } else {
        const created = await createTestimonial.mutateAsync({
          event_type_id: existingEvent.id,
          author_name: testimonialForm.author_name,
          author_title: testimonialForm.author_title || null,
          avatar_url: null,
          rating,
          content: testimonialForm.content,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          is_visible: testimonialForm.is_visible,
        });

        if (testimonialAvatarFile) {
          setIsTestimonialAvatarUploading(true);
          const avatarUrl = await uploadPublicImage(`testimonials/${created.id}`, testimonialAvatarFile);
          await updateTestimonial.mutateAsync({ id: created.id, avatar_url: avatarUrl });
        }
        toast.success('Testimonial added');
      }
      setIsTestimonialDialogOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save testimonial';
      toast.error(message);
    } finally {
      setIsTestimonialAvatarUploading(false);
    }
  };

  // Auto-select default schedule for new events
  useEffect(() => {
    if (isNew && schedules && schedules.length > 0 && !scheduleId) {
      const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
      setScheduleId(defaultSchedule.id);
    }
  }, [isNew, schedules, scheduleId]);

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

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setCustomFields([...customFields, newField]);

    // Auto-scroll to the new field after state update
    setTimeout(() => {
      lastFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(fields =>
      fields.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(fields => fields.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!slug.trim()) {
      toast.error('Please enter a URL slug');
      return;
    }

    // Validate custom fields
    for (const field of customFields) {
      if (!field.label.trim()) {
        toast.error('All custom fields must have a label');
        return;
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        toast.error('Dropdown fields must have at least one option');
        return;
      }
    }

    setIsSubmitting(true);

    const finalDuration = DURATIONS.includes(duration) ? duration : parseInt(customDuration) || 30;

    const eventData: Omit<TablesInsert<'event_types'>, 'user_id' | 'id' | 'created_at' | 'updated_at'> = {
      title,
      slug,
      description: description || null,
      banner_image_url: bannerImageUrl.trim() ? bannerImageUrl.trim() : null,
      duration: finalDuration,
      buffer_before: bufferBefore,
      buffer_after: bufferAfter,
      location_type: locationType,
      location_value: locationValue || null,
      is_active: isActive,
      minimum_notice: minimumNotice,
      color,
      custom_fields: customFields as unknown as Json,
      social_links: (socialLinks as unknown as Json) || null,
      is_paid: isPaid,
      price: isPaid ? parseFloat(price) || 0 : 0,
      payment_provider: isPaid ? paymentProvider : null,
      instructor_id: instructorId,
      schedule_id: scheduleId,
      show_testimonials: showTestimonials,
      // @ts-ignore
      allow_rescheduling: allowRescheduling,
      // @ts-ignore
      reschedule_price: reschedulePrice,
    };

    try {
      if (isNew) {
        await createEventType.mutateAsync(eventData);
        toast.success('Event type created!');
      } else if (existingEvent) {
        await updateEventType.mutateAsync({ id: existingEvent.id, ...(eventData as TablesUpdate<'event_types'>) });
        toast.success('Event type updated!');
      }
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Error saving event type:', error);
      const message = error instanceof Error ? error.message : 'Failed to save event type';
      toast.error(message);
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
    scheduleAvailability?.forEach(a => {
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
            {!isNew && (
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this event type? This action cannot be undone.')) {
                    try {
                      await deleteEventType.mutateAsync(id!);
                      toast.success('Event type deleted');
                      navigate('/dashboard');
                    } catch (e: any) {
                      toast.error(e.message || 'Failed to delete event type');
                    }
                  }
                }}
                disabled={deleteEventType.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
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
          {/* Testimonials */}
          <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Testimonials</h3>
                <p className="text-sm text-muted-foreground">
                  Manage and display testimonials on your booking page.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Show on booking page</Label>
                  <Switch checked={showTestimonials} onCheckedChange={setShowTestimonials} />
                </div>
                <Button variant="outline" size="sm" onClick={openCreateTestimonial} disabled={isNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {isNew ? (
              <div className="mt-4 text-sm text-muted-foreground">
                Save the event type first to add testimonials.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {(testimonials || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No testimonials yet.</div>
                ) : (
                  (testimonials || []).map((t) => (
                    <div key={t.id} className="p-4 rounded-lg border border-border bg-background">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{t.author_name}</p>
                            {!t.is_visible && (
                              <span className="text-xs text-muted-foreground">Hidden</span>
                            )}
                          </div>
                          {t.author_title && (
                            <p className="text-sm text-muted-foreground">{t.author_title}</p>
                          )}
                          {t.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'w-4 h-4',
                                    i < t.rating! ? 'text-primary fill-primary' : 'text-muted-foreground/40'
                                  )}
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-sm mt-2 whitespace-pre-wrap">{t.content}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTestimonial(t)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={async () => {
                              try {
                                await updateTestimonial.mutateAsync({ id: t.id, is_visible: !t.is_visible });
                              } catch (e: unknown) {
                                const message = e instanceof Error ? e.message : 'Failed to update testimonial';
                                toast.error(message);
                              }
                            }}
                          >
                            {t.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await deleteTestimonial.mutateAsync({ id: t.id, event_type_id: t.event_type_id });
                                toast.success('Testimonial deleted');
                              } catch (e: unknown) {
                                const message = e instanceof Error ? e.message : 'Failed to delete testimonial';
                                toast.error(message);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <Dialog open={isTestimonialDialogOpen} onOpenChange={setIsTestimonialDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{testimonialForm.id ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
                  <DialogDescription>These testimonials can be shown on the public booking page.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input value={testimonialForm.author_name} onChange={(e) => setTestimonialForm(s => ({ ...s, author_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Author Title</Label>
                      <Input value={testimonialForm.author_title} onChange={(e) => setTestimonialForm(s => ({ ...s, author_title: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Avatar</Label>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={testimonialForm.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {testimonialForm.author_name?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={testimonialAvatarFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            aria-label="Upload testimonial avatar"
                            title="Upload testimonial avatar"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith('image/')) {
                                toast.error('Please select an image file');

                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Image must be less than 5MB');
                                return;
                              }
                              setTestimonialAvatarFile(file);
                              setTestimonialForm(s => ({ ...s, avatar_url: URL.createObjectURL(file) }));
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => testimonialAvatarFileInputRef.current?.click()}
                          >
                            Upload
                          </Button>
                          {testimonialForm.avatar_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestimonialAvatarFile(null);
                                setTestimonialForm(s => ({ ...s, avatar_url: '' }));
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Rating (1-5)</Label>
                    <Input value={testimonialForm.rating} onChange={(e) => setTestimonialForm(s => ({ ...s, rating: e.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Testimonial</Label>
                    <Textarea value={testimonialForm.content} onChange={(e) => setTestimonialForm(s => ({ ...s, content: e.target.value }))} className="min-h-[120px]" />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Visible</Label>
                      <Switch checked={testimonialForm.is_visible} onCheckedChange={(v) => setTestimonialForm(s => ({ ...s, is_visible: v }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Sort Order</Label>
                      <Input className="w-24" value={testimonialForm.sort_order} onChange={(e) => setTestimonialForm(s => ({ ...s, sort_order: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTestimonialDialogOpen(false)}>Cancel</Button>
                  <Button onClick={submitTestimonial} disabled={createTestimonial.isPending || updateTestimonial.isPending || isTestimonialAvatarUploading}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Instructor Assignment */}
          <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Assign Instructor</h3>
            </div>

            {instructors && instructors.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Instructor</Label>
                  <Select value={instructorId || 'none'} onValueChange={(v) => setInstructorId(v === 'none' ? null : v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose an instructor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No instructor (use my profile)</SelectItem>
                      {instructors.filter(i => i.is_active).map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={instructor.avatar_url || ''} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {instructor.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{instructor.name}</span>
                            {instructor.specialization && (
                              <span className="text-muted-foreground">({instructor.specialization})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {instructorId && (
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    {(() => {
                      const selected = instructors.find(i => i.id === instructorId);
                      return selected ? (
                        <>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={selected.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {selected.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{selected.name}</p>
                            <p className="text-sm text-muted-foreground">{selected.email}</p>
                            {selected.specialization && (
                              <p className="text-sm text-primary">{selected.specialization}</p>
                            )}
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No instructors added yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/instructors">Add Instructors</Link>
                </Button>
              </div>
            )}

            {!instructorId && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile?.name || 'Your Name'}</p>
                  <p className="text-sm text-muted-foreground">Using your profile as host</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto" asChild>
                  <Link to="/dashboard/settings">Edit Profile</Link>
                </Button>
              </div>
            )}
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

            <div className="space-y-2">
              <Label>Banner Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-40 h-24 rounded-lg border border-border bg-muted overflow-hidden">
                  {bannerImageUrl ? (
                    <img src={bannerImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload event banner image"
                    title="Upload event banner image"
                    onChange={handleBannerFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isBannerUploading}
                  >
                    {isBannerUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  {bannerImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBannerImageUrl('')}
                      disabled={isBannerUploading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This image will be shown at the top of the public booking page.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Social Links</Label>
                <p className="text-sm text-muted-foreground">Add links (Pinterest, Instagram, etc.) to display icons on the public booking page.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="social-website">Website</Label>
                  <Input
                    id="social-website"
                    placeholder="https://yourwebsite.com"
                    value={socialLinks.website || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, website: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-linkedin">LinkedIn</Label>
                  <Input
                    id="social-linkedin"
                    placeholder="https://linkedin.com/in/..."
                    value={socialLinks.linkedin || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, linkedin: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-instagram">Instagram</Label>
                  <Input
                    id="social-instagram"
                    placeholder="https://instagram.com/..."
                    value={socialLinks.instagram || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, instagram: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-facebook">Facebook</Label>
                  <Input
                    id="social-facebook"
                    placeholder="https://facebook.com/..."
                    value={socialLinks.facebook || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, facebook: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-twitter">X / Twitter</Label>
                  <Input
                    id="social-twitter"
                    placeholder="https://x.com/..."
                    value={socialLinks.twitter || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, twitter: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-youtube">YouTube</Label>
                  <Input
                    id="social-youtube"
                    placeholder="https://youtube.com/@..."
                    value={socialLinks.youtube || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, youtube: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-pinterest">Pinterest</Label>
                  <Input
                    id="social-pinterest"
                    placeholder="https://pinterest.com/..."
                    value={socialLinks.pinterest || ''}
                    onChange={(e) => setSocialLinks(s => ({ ...s, pinterest: e.target.value }))}
                    className="bg-background"
                  />
                </div>
              </div>
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

          {/* Custom Form Fields */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Booking Form Questions</h3>
              </div>
              <Button variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Add custom questions to collect information from attendees when they book.
              Name, email, and notes are collected by default.
            </p>

            {customFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom questions yet</p>
                <p className="text-xs">Click "Add Question" to create a custom form field</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-border rounded-lg bg-background space-y-4 shadow-sm"
                    ref={index === customFields.length - 1 ? lastFieldRef : null}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground cursor-grab">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-sm font-medium">Q{index + 1}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Question Label</Label>
                          <Input
                            placeholder="e.g. Company Name"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                            className="bg-card"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => updateCustomField(field.id, { type: v as CustomField['type'] })}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {field.type === 'select' && (
                      <div className="ml-10 space-y-2">
                        <Label>Options (one per line)</Label>
                        <Textarea
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          value={field.options?.join('\n') || ''}
                          onChange={(e) =>
                            updateCustomField(field.id, {
                              options: e.target.value.split('\n').filter((o) => o.trim()),
                            })
                          }
                          className="bg-card min-h-[80px]"
                        />
                      </div>
                    )}

                    <div className="ml-10 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateCustomField(field.id, { required: !!checked })
                          }
                        />
                        <Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
                          Required
                        </Label>
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Placeholder text (optional)"
                          value={field.placeholder || ''}
                          onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })}
                          className="bg-card h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed py-6 group"
                    onClick={addCustomField}
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Add another question
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Availability Schedule */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Availability Schedule</h3>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/availability">Manage Schedules</Link>
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Select Schedule</Label>
              <Select value={scheduleId || ''} onValueChange={(v) => setScheduleId(v || null)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose an availability schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {schedules?.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      <div className="flex items-center gap-2">
                        <span>{schedule.name}</span>
                        {schedule.is_default && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This schedule determines when attendees can book this event type
              </p>
            </div>

            {scheduleAvailability && scheduleAvailability.length > 0 && (
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
                      <p className="text-xs text-muted-foreground/50">Off</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Settings */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Payment Settings</h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div>
                <p className="font-medium">Paid Event</p>
                <p className="text-sm text-muted-foreground">
                  Require payment before booking is confirmed
                </p>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
            </div>

            {isPaid && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-background rounded-lg border border-border">
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-9 bg-card"
                      min="1"
                      step="1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter amount in INR</p>
                </div>
                <div className="space-y-2">
                  <Label>Payment Gateway</Label>
                  <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose your preferred gateway</p>
                </div>
              </div>
            )}
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
                  <div className="space-y-2">
                    <Label htmlFor="allow-rescheduling">Allow Rescheduling</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        id="allow-rescheduling"
                        checked={allowRescheduling}
                        onCheckedChange={setAllowRescheduling}
                      />
                      <span className="text-sm text-muted-foreground">
                        {allowRescheduling ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Can attendees reschedule this event?</p>
                  </div>

                  {allowRescheduling && (
                    <div className="space-y-2">
                      <Label>Reschedule Price (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={reschedulePrice}
                          onChange={(e) => setReschedulePrice(Number(e.target.value))}
                          className="pl-9 bg-background"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Charge for rescheduling (0 for free)</p>
                    </div>
                  )}
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