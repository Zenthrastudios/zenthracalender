import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useWebinars, useDeleteWebinar } from '@/hooks/useWebinars';
import CreateWebinarDialog from '@/components/webinar/CreateWebinarDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Video,
    Plus,
    Calendar,
    Clock,
    MoreVertical,
    Copy,
    Trash2,
    ExternalLink,
    Edit,
    Image as ImageIcon,
    BarChart2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function Webinars() {
    const { data: webinars, isLoading } = useWebinars();
    const deleteWebinar = useDeleteWebinar();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const navigate = useNavigate();

    const copyLink = (id: string) => {
        const link = `${window.location.origin}/webinar/${id}`;
        navigator.clipboard.writeText(link);
        toast.success('Registration link copied!');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this webinar?')) {
            try {
                await deleteWebinar.mutateAsync(id);
                toast.success('Webinar deleted');
            } catch (error) {
                toast.error('Failed to delete');
            }
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Webinars & Masterclasses</h1>
                        <p className="text-muted-foreground mt-1">Schedule live classes, generate Google Meet links, and collect payments.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                        <Plus className="w-4 h-4" /> Create Webinar
                    </Button>
                </div>

                {!webinars?.length ? (
                    <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold">No webinars scheduled</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            Get started by scheduling your first live session. You can charge for access or offer it for free.
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="mt-6">
                            Schedule Now
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {webinars.map((webinar) => (
                            <Card key={webinar.id} className="group hover:shadow-md transition-all border-border/60 overflow-hidden relative flex flex-col">
                                {webinar.cover_image_url ? (
                                    <div className="h-40 w-full overflow-hidden border-b relative">
                                        <img src={webinar.cover_image_url} alt={webinar.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                            <Badge variant={webinar.is_paid ? "default" : "secondary"} className="mb-0">
                                                {webinar.is_paid ? `₹${webinar.price}` : 'Free'}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}

                                <CardHeader className="pb-3 flex-1">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            {!webinar.cover_image_url && (
                                                <Badge variant={webinar.is_paid ? "default" : "secondary"} className="mb-2">
                                                    {webinar.is_paid ? `₹${webinar.price}` : 'Free'}
                                                </Badge>
                                            )}
                                            <CardTitle className="line-clamp-1">{webinar.title}</CardTitle>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/webinars/${webinar.id}/analytics`)}>
                                                    <BarChart2 className="w-4 h-4 mr-2" /> View Analytics
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/webinars/${webinar.id}/edit`)}>
                                                    <Edit className="w-4 h-4 mr-2" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyLink(webinar.id)}>
                                                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(webinar.meet_link || '', '_blank')} disabled={!webinar.meet_link}>
                                                    <ExternalLink className="w-4 h-4 mr-2" /> Join Meeting
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(webinar.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">
                                        {webinar.description || 'No description provided.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3 text-sm space-y-2.5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4 text-primary/70" />
                                        <span>{format(parseISO(webinar.start_time), 'EEE, MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4 text-primary/70" />
                                        <span>
                                            {format(parseISO(webinar.start_time), 'h:mm a')} - {format(parseISO(webinar.end_time), 'h:mm a')}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-3 border-t bg-muted/20 flex gap-2">
                                    <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/dashboard/webinars/${webinar.id}/edit`)}>
                                        <Edit className="w-3.5 h-3.5" /> Manage
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => copyLink(webinar.id)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                        }
                    </div >
                )}

                <CreateWebinarDialog
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                />
            </div >
        </DashboardLayout >
    );
}
