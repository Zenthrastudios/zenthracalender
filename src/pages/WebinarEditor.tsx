import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useWebinar, useUpdateWebinar } from '@/hooks/useWebinars';
import { supabase } from '@/integrations/supabase/client'; // For storage
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Save,
    Loader2,
    Upload,
    Image as ImageIcon,
    Plus,
    Trash2,
    Calendar,
    Clock,
    Video,
    Mic,
    HelpCircle,
    Eye,
    BarChart2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

export default function WebinarEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: webinar, isLoading } = useWebinar(id!);
    const updateWebinar = useUpdateWebinar();

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [price, setPrice] = useState(0);
    const [isPaid, setIsPaid] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [meetLink, setMeetLink] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [themeColor, setThemeColor] = useState('#3b82f6');
    const [speakers, setSpeakers] = useState<any[]>([]);
    const [faq, setFaq] = useState<any[]>([]);

    const [isUploadingCover, setIsUploadingCover] = useState(false);

    useEffect(() => {
        if (webinar) {
            setTitle(webinar.title);
            setDescription(webinar.description || '');
            setContent(webinar.content || '');
            setPrice(webinar.price);
            setIsPaid(webinar.is_paid);
            // Format dates for datetime-local input
            setStartTime(webinar.start_time ? new Date(webinar.start_time).toISOString().slice(0, 16) : '');
            setEndTime(webinar.end_time ? new Date(webinar.end_time).toISOString().slice(0, 16) : '');
            setMeetLink(webinar.meet_link || '');
            setCoverImageUrl(webinar.cover_image_url || '');
            setThemeColor(webinar.theme_color || '#3b82f6');
            setSpeakers(webinar.speakers || []);
            setFaq(webinar.faq || []);
        }
    }, [webinar]);

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            await updateWebinar.mutateAsync({
                id,
                title,
                description,
                content,
                price: isPaid ? price : 0,
                is_paid: isPaid,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                meet_link: meetLink,
                cover_image_url: coverImageUrl,
                theme_color: themeColor,
                speakers,
                faq
            });
            toast.success('Webinar updated successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update webinar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingCover(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${id}/cover.${fileExt}`;

            // Use 'course-thumbnails' bucket with user-scoped path to satisfy RLS
            const storageBucket = 'course-thumbnails';
            const storagePath = `${user.id}/${id}/cover.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(storageBucket)
                .upload(storagePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(storageBucket)
                .getPublicUrl(storagePath);

            setCoverImageUrl(publicUrl);
            toast.success('Cover image uploaded!');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to upload cover image');
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleSpeakerAvatarUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${id}/speakers/${Date.now()}.${fileExt}`;
            const storageBucket = 'course-thumbnails';

            const { error: uploadError } = await supabase.storage
                .from(storageBucket)
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(storageBucket)
                .getPublicUrl(fileName);

            updateSpeaker(index, 'avatar_url', publicUrl);
            toast.success('Speaker photo uploaded');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to upload photo');
        }
    };

    const addSpeaker = () => {
        setSpeakers([...speakers, { name: '', role: '', bio: '', avatar_url: '' }]);
    };

    const updateSpeaker = (index: number, field: string, value: string) => {
        const newSpeakers = [...speakers];
        newSpeakers[index] = { ...newSpeakers[index], [field]: value };
        setSpeakers(newSpeakers);
    };

    const removeSpeaker = (index: number) => {
        setSpeakers(speakers.filter((_, i) => i !== index));
    };

    const addFaq = () => {
        setFaq([...faq, { question: '', answer: '' }]);
    };

    const updateFaq = (index: number, field: string, value: string) => {
        const newFaq = [...faq];
        newFaq[index] = { ...newFaq[index], [field]: value };
        setFaq(newFaq);
    };

    const removeFaq = (index: number) => {
        setFaq(faq.filter((_, i) => i !== index));
    };

    const copyPublicLink = () => {
        const link = `${window.location.origin}/webinar/${id}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!webinar) return null;

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/webinars')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold line-clamp-1">{title || 'Untitled Webinar'}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Badge variant="outline">{isPaid ? 'Paid' : 'Free'}</Badge>
                                <span>•</span>
                                <span>{format(new Date(startTime || new Date()), 'MMM d, yyyy')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate(`/dashboard/webinars/${id}/analytics`)}>
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Analytics
                        </Button>
                        <Button variant="outline" onClick={copyPublicLink}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Public Page
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="details">Details & Schedule</TabsTrigger>
                        <TabsTrigger value="content">Page Content</TabsTrigger>
                        <TabsTrigger value="speakers">Speakers & FAQ</TabsTrigger>
                    </TabsList>

                    {/* DETAILS TAB */}
                    <TabsContent value="details" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Key details about your webinar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Webinar Title</Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Description</Label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="A brief summary for the card view..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Schedule</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <Input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Location & Pricing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Meeting Link (Google Meet/Zoom)</Label>
                                        <div className="relative">
                                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                value={meetLink}
                                                onChange={e => setMeetLink(e.target.value)}
                                                placeholder="https://meet.google.com/..."
                                            />
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <Label>Is this a paid webinar?</Label>
                                        <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                                    </div>
                                    {isPaid && (
                                        <div className="space-y-2">
                                            <Label>Price (INR)</Label>
                                            <Input
                                                type="number"
                                                value={price}
                                                onChange={e => setPrice(Number(e.target.value))}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* CONTENT TAB */}
                    <TabsContent value="content" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>About the Event</CardTitle>
                                        <CardDescription>Detailed information displayed on the registration page.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <Label>Content (Rich Text / Markdown)</Label>
                                            <Textarea
                                                className="min-h-[400px] font-mono text-sm leading-relaxed"
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                                placeholder="Write a detailed description of what attendees will learn..."
                                            />
                                            <p className="text-xs text-muted-foreground">Markdown is supported for formatting.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cover Image</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative border">
                                            {coverImageUrl ? (
                                                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-xs">No cover image</span>
                                                </div>
                                            )}
                                        </div>
                                        <label>
                                            <Button variant="outline" className="w-full cursor-pointer" disabled={isUploadingCover} asChild>
                                                <span>
                                                    {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                    Upload Cover
                                                </span>
                                            </Button>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                                        </label>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Theme</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <Label>Accent Color</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={themeColor}
                                                    onChange={e => setThemeColor(e.target.value)}
                                                    className="w-10 h-10 rounded border cursor-pointer"
                                                />
                                                <Input value={themeColor} onChange={e => setThemeColor(e.target.value)} className="font-mono uppercase" maxLength={7} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* SPEAKERS & FAQ TAB */}
                    <TabsContent value="speakers" className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Speakers / Hosts</CardTitle>
                                    <CardDescription>Who will be presenting?</CardDescription>
                                </div>
                                <Button size="sm" onClick={addSpeaker} variant="outline">
                                    <Plus className="w-4 h-4 mr-2" /> Add Speaker
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {speakers.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                        No speakers added yet.
                                    </div>
                                )}
                                {speakers.map((speaker, idx) => (
                                    <div key={idx} className="flex gap-4 items-start border p-4 rounded-lg relative group">
                                        <div className="flex-shrink-0">
                                            <Label htmlFor={`speaker-upload-${idx}`} className="cursor-pointer relative block w-16 h-16 rounded-full overflow-hidden bg-muted group/avatar">
                                                {speaker.avatar_url ? (
                                                    <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                        <Mic className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                                    <Upload className="w-4 h-4 text-white" />
                                                </div>
                                            </Label>
                                            <input
                                                id={`speaker-upload-${idx}`}
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleSpeakerAvatarUpload(idx, e)}
                                            />
                                        </div>
                                        <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input
                                                    value={speaker.name}
                                                    onChange={e => updateSpeaker(idx, 'name', e.target.value)}
                                                    placeholder="Speaker Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Role / Title</Label>
                                                <Input
                                                    value={speaker.role}
                                                    onChange={e => updateSpeaker(idx, 'role', e.target.value)}
                                                    placeholder="e.g. Senior Technologist"
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <Label>Bio</Label>
                                                <Textarea
                                                    value={speaker.bio}
                                                    onChange={e => updateSpeaker(idx, 'bio', e.target.value)}
                                                    placeholder="Short bio..."
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => removeSpeaker(idx)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>FAQ</CardTitle>
                                    <CardDescription>Frequently Asked Questions</CardDescription>
                                </div>
                                <Button size="sm" onClick={addFaq} variant="outline">
                                    <Plus className="w-4 h-4 mr-2" /> Add Question
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {faq.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No FAQs added yet.
                                    </div>
                                )}
                                {faq.map((item, idx) => (
                                    <div key={idx} className="space-y-3 p-4 border rounded-lg relative group">
                                        <div className="space-y-2">
                                            <Label>Question</Label>
                                            <Input
                                                value={item.question}
                                                onChange={e => updateFaq(idx, 'question', e.target.value)}
                                                placeholder="e.g. Will there be a recording?"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Answer</Label>
                                            <Textarea
                                                value={item.answer}
                                                onChange={e => updateFaq(idx, 'answer', e.target.value)}
                                                placeholder="Yes, all registrants will receive only..."
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => removeFaq(idx)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
