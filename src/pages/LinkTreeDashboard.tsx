import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useMyLinkPages, useCreateLinkPage } from '@/hooks/useLinkPages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, ExternalLink, Edit, MoreVertical, Trash2, Smartphone, Globe } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LinkTreeDashboard() {
    const navigate = useNavigate();
    const { data: pages, isLoading } = useMyLinkPages();
    const createPage = useCreateLinkPage();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemSlug, setNewItemSlug] = useState('');

    const handleCreate = async () => {
        if (!newItemTitle || !newItemSlug) return;
        try {
            const newPage = await createPage.mutateAsync({ title: newItemTitle, slug: newItemSlug });
            setIsCreateOpen(false);
            navigate(`/dashboard/links/${newPage.id}/edit`);
        } catch (e) {
            console.error(e);
            // toast handled by hook or global
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8 max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bio Link Pages</h1>
                        <p className="text-muted-foreground mt-2">Manage your "Link in Bio" pages to share multiple links easily.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Create Page
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : pages && pages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map(page => {
                            const totalClicks = page.links?.reduce((sum, link) => sum + (link.clicks || 0), 0) || 0;
                            const clickThroughRate = page.view_count > 0 ? ((totalClicks / page.view_count) * 100).toFixed(1) : '0';

                            return (
                                <Card key={page.id} className="group relative overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[1.75rem] bg-card hover:bg-accent/5">
                                    {/* Colorful Top Border */}
                                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-90" />

                                    <CardHeader className="flex flex-row items-start justify-between pb-0 pt-7 px-7">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shadow-sm border border-border/50 shrink-0">
                                                {page.avatar_url ? (
                                                    <img src={page.avatar_url} alt={page.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-muted-foreground">
                                                        <Smartphone className="w-7 h-7 opacity-50" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5 min-w-0">
                                                <h3 className="text-xl font-bold tracking-tight text-foreground truncate pr-2">{page.title}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                                                    <Globe className="w-3.5 h-3.5" />
                                                    <span className="font-mono truncate">/{page.slug}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-foreground rounded-full">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/links/${page.id}/edit`)} className="rounded-lg cursor-pointer">
                                                    <Edit className="w-4 h-4 mr-2" /> Edit Page
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`/links/${page.slug}`, '_blank')} className="rounded-lg cursor-pointer">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> View Live
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg cursor-pointer">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>

                                    <CardContent className="px-7 pb-7 mt-4">
                                        {/* Stats Container */}
                                        <div className="flex items-center justify-between p-4 mb-6 rounded-2xl bg-muted/40 border border-border/40">
                                            <div className="flex-1 text-center">
                                                <div className="text-2xl font-black text-foreground tracking-tight">{page.view_count || 0}</div>
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Views</div>
                                            </div>
                                            <div className="w-px h-8 bg-border/60 mx-2" />
                                            <div className="flex-1 text-center">
                                                <div className="text-2xl font-black text-foreground tracking-tight">{totalClicks}</div>
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Clicks</div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3">
                                            <Button
                                                className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold tracking-wide shadow-md shadow-orange-500/20 hover:shadow-orange-500/40 transition-all rounded-xl h-11"
                                                onClick={() => navigate(`/dashboard/links/${page.id}/edit`)}
                                            >
                                                Manage Page
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-11 w-11 border-2 border-border/50 bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                                                onClick={() => window.open(`/links/${page.slug}`, '_blank')}
                                                title="View Live Page"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/50">
                        <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-foreground">No Pages Yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">Create your first Link-in-Bio page to showcase all your important links in one place.</p>
                        <Button onClick={() => setIsCreateOpen(true)}>Create Page</Button>
                    </div>
                )}

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Link Page</DialogTitle>
                            <DialogDescription>Choose a unique URL for your page.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Page Title</Label>
                                <Input placeholder="My Awesome Links" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Unique Slug</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">/links/</span>
                                    <Input placeholder="my-name" value={newItemSlug} onChange={e => setNewItemSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!newItemTitle || !newItemSlug}>Create Page</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
