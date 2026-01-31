import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useWebinars, useCreateWebinar } from '@/hooks/useWebinars';
import { useIntegrations, useGoogleCalendar } from '@/hooks/useIntegrations';
import { Loader2, Calendar, Video } from 'lucide-react';
import { toast } from 'sonner';
import { addMinutes, format, parseISO } from 'date-fns';

interface CreateWebinarDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateWebinarDialog({ isOpen, onClose }: CreateWebinarDialogProps) {
    const createWebinar = useCreateWebinar();
    const { data: integrations } = useIntegrations();
    const googleCalendar = useGoogleCalendar();

    const isGoogleConnected = integrations?.some(i => i.provider === 'google');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        startTime: '',
        duration: 60,
        price: 0,
        createMeetLink: false,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Calculate start and end ISO strings
            // Ideally use proper date picker, simplified here for text input 'YYYY-MM-DD' and 'HH:mm'
            const startDateTimeString = `${formData.date}T${formData.startTime}:00`;
            const startDate = new Date(startDateTimeString);
            const endDate = addMinutes(startDate, formData.duration);

            let meetLink = null;
            let googleEventId = null;

            if (formData.createMeetLink && isGoogleConnected) {
                try {
                    const eventResult = await googleCalendar.createEvent({
                        title: formData.title,
                        description: formData.description,
                        startTime: startDate.toISOString(),
                        endTime: endDate.toISOString(),
                        createMeet: true,
                    });

                    if (eventResult && eventResult.hangoutLink) {
                        meetLink = eventResult.hangoutLink;
                        googleEventId = eventResult.id;
                        toast.success('Google Meet link generated!');
                    }
                } catch (err) {
                    console.error("Google Calendar Error", err);
                    toast.error('Failed to create Google Calendar event, but creating class anyway.');
                }
            }

            await createWebinar.mutateAsync({
                title: formData.title,
                description: formData.description,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                price: Number(formData.price),
                currency: 'INR',
                is_paid: Number(formData.price) > 0,
                meet_link: meetLink,
                google_event_id: googleEventId,
                max_attendees: 100 // default limit
            });

            toast.success('Webinar created successfully!');
            onClose();
            setFormData({
                title: '',
                description: '',
                date: '',
                startTime: '',
                duration: 60,
                price: 0,
                createMeetLink: false,
            });

        } catch (error: any) {
            toast.error(error.message || 'Failed to create webinar');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle>Create New Webinar</DialogTitle>
                            <DialogDescription>Schedule a class and optionally generate a Meet link</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Advanced Yoga Masterclass"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What will students learn?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tiime">Start Time</Label>
                            <Input
                                id="time"
                                type="time"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                min="15"
                                step="15"
                                value={formData.duration}
                                onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (INR)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                            <p className="text-[10px] text-muted-foreground">Set to 0 for free webinars</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Google Meet Link</Label>
                            <p className="text-xs text-muted-foreground">Automatically generate meeting link</p>
                        </div>
                        <Switch
                            checked={formData.createMeetLink}
                            onCheckedChange={checked => {
                                if (checked && !isGoogleConnected) {
                                    toast.error('Please connect Google Calendar in Apps first');
                                    return;
                                }
                                setFormData({ ...formData, createMeetLink: checked });
                            }}
                            disabled={!isGoogleConnected}
                        />
                    </div>
                    {!isGoogleConnected && (
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Connect Google Calendar in Apps to enable auto-meet links.
                        </p>
                    )}

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Webinar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
