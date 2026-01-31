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
                        <h1 className="text-3xl font-bold tracking-tight">Bio Link Pages</h1>
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
                                <Card key={page.id} className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all hover:shadow-2xl hover:shadow-primary/5">
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-primary shadow-inner">
                                                {page.avatar_url ? (
                                                    <img src={page.avatar_url} alt={page.title} className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <Smartphone className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg font-bold tracking-tight">{page.title}</CardTitle>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Globe className="w-3 h-3" />
                                                    <span className="font-mono text-zinc-500">/{page.slug}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/links/${page.id}/edit`)}>
                                                    <Edit className="w-4 h-4 mr-2" /> Edit Page
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`/links/${page.slug}`, '_blank')}>
                                                    <ExternalLink className="w-4 h-4 mr-2" /> View Live
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500 focus:text-red-500">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>

                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 my-4 p-3 rounded-lg bg-black/20 border border-white/5">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-white">{page.view_count || 0}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Views</div>
                                            </div>
                                            <div className="text-center relative">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-zinc-800" />
                                                <div className="text-2xl font-bold text-white">{totalClicks}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Clicks</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 mt-4">
                                            <Button
                                                variant="outline"
                                                className="flex-1 bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:text-white group-hover:border-primary/50 transition-colors"
                                                onClick={() => navigate(`/dashboard/links/${page.id}/edit`)}
                                            >
                                                Manage Page
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                                                onClick={() => window.open(`/links/${page.slug}`, '_blank')}
                                            >
                                                <ExternalLink className="w-4 h-4" />
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
