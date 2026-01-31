import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLinkPage, useUpdateLinkPage, LinkItem, LinkPageTheme } from '@/hooks/useLinkPages';
import { uploadImage } from '@/lib/imageUpload'; // Using our new helper
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    GripVertical,
    Image as ImageIcon,
    Layout,
    Link as LinkIcon,
    Palette,
    Settings as SettingsIcon,
    ExternalLink,
    Smartphone,
    BarChart2,
    Share2,
    Upload,
    Sparkles,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PRESET_THEMES } from '@/lib/linkThemes';

import LinkAnalytics from '@/components/LinkAnalytics';

// Simple Phone Mockup Component
const PhonePreview = ({ page, theme, links }: { page: any, theme: LinkPageTheme, links: LinkItem[] }) => {
    // Styles derivation
    const bgStyle = theme.backgroundType === 'image' ? {
        backgroundImage: `url(${theme.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center'
    } : theme.backgroundType === 'gradient' ? {
        background: theme.backgroundGradient
    } : {
        backgroundColor: theme.backgroundColor
    };

    const btnStyle = {
        backgroundColor: theme.buttonColor,
        color: theme.buttonTextColor,
        borderRadius: theme.buttonStyle === 'rounded' ? '9999px' : theme.buttonStyle === 'square' ? '8px' : '4px',
        border: theme.buttonStyle === 'outline' ? `2px solid ${theme.buttonColor}` : 'none',
        // If outline, text color matches border usually, unless specified.
    };

    // Override for outline 
    const finalBtnStyle = theme.buttonStyle === 'outline' ? {
        ...btnStyle,
        backgroundColor: 'transparent',
        color: theme.buttonColor
    } : btnStyle;

    return (
        <div className="w-[320px] h-[640px] border-[12px] border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl bg-white relative mx-auto">
            {/* Dynamic Background */}
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide" style={{ ...bgStyle, fontFamily: theme.font }}>
                <div className="min-h-full py-12 px-6 flex flex-col items-center gap-6">
                    {/* Profile */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 shadow-lg bg-gray-200">
                            {page?.avatar_url ? (
                                <img src={page.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}
                        </div>
                        <div style={{ color: theme.textColor }}>
                            <h2 className="text-xl font-bold">{page?.title || 'My Bio Link'}</h2>
                            <p className="text-sm opacity-90 whitespace-pre-wrap">{page?.bio}</p>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="w-full space-y-3">
                        {links.filter(l => l.isActive).map((link) => (
                            <a
                                key={link.id}
                                href='#preview' // Prevent Navigation
                                className="block w-full py-3 px-4 text-center font-medium transition-transform hover:scale-[1.02] active:scale-95 shadow-sm"
                                style={finalBtnStyle}
                            >
                                {link.title}
                            </a>
                        ))}
                    </div>

                    {/* Branding */}
                    <div className="mt-auto pt-8 pb-4">
                        <span className="text-[10px] font-semibold opacity-50 px-2 py-1 bg-black/10 rounded-full" style={{ color: theme.textColor }}>
                            Zenthra Link
                        </span>
                    </div>
                </div>
            </div>
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-zinc-900 rounded-b-xl z-20"></div>
        </div>
    );
};

export default function LinkTreeEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: page, isLoading } = useLinkPage(id!);
    const updatePage = useUpdateLinkPage();

    const [activeTab, setActiveTab] = useState('links');
    const [isSaving, setIsSaving] = useState(false);
    const [isThemesExpanded, setIsThemesExpanded] = useState(false);

    // State
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [slug, setSlug] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [theme, setTheme] = useState<LinkPageTheme>({
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundGradient: 'linear-gradient(to bottom, #a18cd1 0%, #fbc2eb 100%)',
        backgroundImage: '',
        buttonStyle: 'rounded',
        buttonColor: '#000000',
        buttonTextColor: '#ffffff',
        font: 'Inter',
        textColor: '#000000'
    });

    useEffect(() => {
        if (page) {
            setTitle(page.title);
            setBio(page.bio || '');
            setSlug(page.slug);
            setAvatarUrl(page.avatar_url || '');
            setLinks(page.links || []);
            setTheme(prev => ({ ...prev, ...(page.theme as any) }));
        }
    }, [page]);

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            await updatePage.mutateAsync({
                id,
                title,
                bio,
                slug,
                avatar_url: avatarUrl,
                links,
                theme: theme as any
            });
            toast.success('Changes saved!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            // Fallback to Supabase for now as implemented
            const result = await uploadImage(file, user.id, id!);
            if (result.success && result.publicUrl) {
                setAvatarUrl(result.publicUrl);
                toast.success("Avatar updated");
            } else {
                toast.error(result.error);
            }
        } catch (e) {
            console.error(e);
            toast.error("Upload failed");
        }
    };

    const addLink = () => {
        const newLink: LinkItem = {
            id: crypto.randomUUID(),
            title: '',
            url: '',
            isActive: true,
            clicks: 0
        };
        setLinks([newLink, ...links]);
    };

    const updateLink = (index: number, field: keyof LinkItem, value: any) => {
        const newLinks = [...links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setLinks(newLinks);
    };

    const deleteLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const moveLink = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === links.length - 1) return;

        const newLinks = [...links];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
        setLinks(newLinks);
    };

    if (isLoading) return <DashboardLayout><div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div></DashboardLayout>;
    if (!page) return <DashboardLayout><div className="p-10 text-center">Page not found</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-65px)] flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT: Editor Area */}
                <div className="flex-1 flex flex-col bg-muted/20 border-r min-w-0">
                    {/* Header */}
                    <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="font-semibold text-lg hidden sm:block">Link Editor</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.open(`/links/${slug}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Public
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </Button>
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 pt-4 bg-background border-b">
                            <TabsList className="bg-transparent p-0 gap-6">
                                <TabsTrigger value="links" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1">
                                    <LinkIcon className="w-4 h-4 mr-2" /> Links
                                </TabsTrigger>
                                <TabsTrigger value="appearance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1">
                                    <Palette className="w-4 h-4 mr-2" /> Appearance
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1">
                                    <SettingsIcon className="w-4 h-4 mr-2" /> Settings
                                </TabsTrigger>
                                <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1">
                                    <BarChart2 className="w-4 h-4 mr-2" /> Analytics
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                            {/* LINKS TAB */}
                            <TabsContent value="links" className="mt-0 space-y-6 max-w-2xl mx-auto">
                                <div className="space-y-4">
                                    <Button className="w-full h-12 dashed" onClick={addLink}>
                                        <Plus className="w-4 h-4 mr-2" /> Add New Link
                                    </Button>

                                    <div className="space-y-3">
                                        {links.map((link, idx) => (
                                            <div key={link.id} className="bg-card border rounded-xl p-4 shadow-sm flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex flex-col gap-1 text-muted-foreground pt-2 cursor-grab active:cursor-grabbing">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Link Title (e.g. My Website)"
                                                            value={link.title}
                                                            onChange={e => updateLink(idx, 'title', e.target.value)}
                                                            className="font-semibold"
                                                        />
                                                        <Switch
                                                            checked={link.isActive}
                                                            onCheckedChange={c => updateLink(idx, 'isActive', c)}
                                                        />
                                                    </div>
                                                    <Input
                                                        placeholder="URL (https://...)"
                                                        value={link.url}
                                                        onChange={e => updateLink(idx, 'url', e.target.value)}
                                                        className="font-mono text-sm bg-muted/50"
                                                    />
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive self-start" onClick={() => deleteLink(idx)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {links.length === 0 && <div className="text-center text-muted-foreground py-10">You usually want at least one link!</div>}
                                </div>
                            </TabsContent>

                            {/* APPEARANCE TAB */}
                            <TabsContent value="appearance" className="mt-0 space-y-8 max-w-2xl mx-auto">

                                {/* Theme Presets */}
                                <section className="space-y-4 bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> Theme Library</h3>
                                            <p className="text-sm text-muted-foreground">Pick a starting theme for your page.</p>
                                        </div>
                                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{PRESET_THEMES.length} Themes</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {PRESET_THEMES.slice(0, isThemesExpanded ? undefined : 6).map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setTheme({ ...preset.theme })}
                                                className="group relative aspect-[3/4] rounded-lg overflow-hidden border transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary text-left shadow-sm hover:shadow-md"
                                            >
                                                <div
                                                    className="absolute inset-0 z-0 bg-cover bg-center"
                                                    style={{ background: preset.thumbnailGradient || preset.theme.backgroundColor }}
                                                />
                                                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                                <div className="absolute bottom-3 left-3 right-3 z-20 text-white font-medium text-sm drop-shadow-md">
                                                    {preset.name}
                                                </div>

                                                {/* Mini Preview Elements */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-3/4 flex flex-col gap-2 opacity-80 group-hover:scale-105 transition-transform">
                                                    <div className="h-2 w-12 bg-white/50 rounded-full mx-auto shadow-sm" />
                                                    <div className="h-6 w-full rounded bg-white/30 backdrop-blur-sm shadow-sm" style={{
                                                        borderRadius: preset.theme.buttonStyle === 'rounded' ? '999px' : preset.theme.buttonStyle === 'square' ? '4px' : '2px',
                                                        border: preset.theme.buttonStyle === 'outline' ? '1px solid rgba(255,255,255,0.8)' : 'none'
                                                    }} />
                                                    <div className="h-6 w-full rounded bg-white/30 backdrop-blur-sm shadow-sm" style={{
                                                        borderRadius: preset.theme.buttonStyle === 'rounded' ? '999px' : preset.theme.buttonStyle === 'square' ? '4px' : '2px',
                                                        border: preset.theme.buttonStyle === 'outline' ? '1px solid rgba(255,255,255,0.8)' : 'none'
                                                    }} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {PRESET_THEMES.length > 6 && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => setIsThemesExpanded(!isThemesExpanded)}
                                        >
                                            {isThemesExpanded ? (
                                                <><ChevronUp className="w-4 h-4 mr-2" /> Show Less</>
                                            ) : (
                                                <><ChevronDown className="w-4 h-4 mr-2" /> View More Themes ({PRESET_THEMES.length - 6} more)</>
                                            )}
                                        </Button>
                                    )}
                                </section>

                                {/* Profile Section */}
                                <section className="space-y-4 bg-card p-6 rounded-xl border">
                                    <h3 className="font-semibold flex items-center gap-2"><Layout className="w-4 h-4" /> Profile</h3>
                                    <div className="flex items-start gap-6">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <Upload className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarUpload} />
                                            <Button size="sm" variant="secondary" className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs h-7">Change</Button>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="space-y-1">
                                                <Label>Page Title</Label>
                                                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="@username" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Bio</Label>
                                                <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the world a little about yourself" rows={2} />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Theme Section */}
                                <section className="space-y-6 bg-card p-6 rounded-xl border">
                                    <h3 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4" /> Design & Colors</h3>

                                    <div className="space-y-4">
                                        <Label>Background</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-4 border rounded-lg cursor-pointer hover:border-primary ${theme.backgroundType === 'color' ? 'ring-2 ring-primary border-primary' : ''}`}
                                                onClick={() => setTheme({ ...theme, backgroundType: 'color' })}>
                                                <div className="mb-2 font-medium text-sm">Solid Color</div>
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-8 h-8 rounded-full border shadow-sm" style={{ backgroundColor: theme.backgroundColor }}></div>
                                                    <Input type="color" value={theme.backgroundColor} className="w-10 h-10 p-1" onChange={e => setTheme({ ...theme, backgroundColor: e.target.value, backgroundType: 'color' })} />
                                                </div>
                                            </div>
                                            <div className={`p-4 border rounded-lg cursor-pointer hover:border-primary ${theme.backgroundType === 'gradient' ? 'ring-2 ring-primary border-primary' : ''}`}
                                                onClick={() => setTheme({ ...theme, backgroundType: 'gradient' })}>
                                                <div className="mb-2 font-medium text-sm">Gradient</div>
                                                <Input value={theme.backgroundGradient} onChange={e => setTheme({ ...theme, backgroundGradient: e.target.value, backgroundType: 'gradient' })} placeholder="linear-gradient(...)" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Buttons Style</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['rounded', 'square', 'outline', 'shadow'].map(s => (
                                                <Button
                                                    key={s}
                                                    variant={theme.buttonStyle === s ? 'default' : 'outline'}
                                                    onClick={() => setTheme({ ...theme, buttonStyle: s as any })}
                                                    className="capitalize"
                                                >
                                                    {s}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Button Color</Label>
                                                <div className="flex gap-2">
                                                    <Input type="color" value={theme.buttonColor} className="w-12" onChange={e => setTheme({ ...theme, buttonColor: e.target.value })} />
                                                    <Input value={theme.buttonColor} onChange={e => setTheme({ ...theme, buttonColor: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Text Color</Label>
                                                <div className="flex gap-2">
                                                    <Input type="color" value={theme.buttonTextColor} className="w-12" onChange={e => setTheme({ ...theme, buttonTextColor: e.target.value })} />
                                                    <Input value={theme.buttonTextColor} onChange={e => setTheme({ ...theme, buttonTextColor: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Page Text Color</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" value={theme.textColor} className="w-12" onChange={e => setTheme({ ...theme, textColor: e.target.value })} />
                                            <Input value={theme.textColor} onChange={e => setTheme({ ...theme, textColor: e.target.value })} />
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="settings" className="mt-0 space-y-6 max-w-2xl mx-auto">
                                <Card>
                                    <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>URL Slug</Label>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-muted-foreground">{window.location.origin}/links/</span>
                                                <Input value={slug} onChange={e => setSlug(e.target.value)} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="analytics" className="mt-0 space-y-6 max-w-4xl mx-auto">
                                <LinkAnalytics pageId={id!} links={links} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* RIGHT: Preview Area */}
                <div className="w-[420px] bg-zinc-50 border-l hidden lg:flex flex-col items-center justify-center p-8 flex-shrink-0 relative">
                    <div className="mb-4 text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Live Preview
                    </div>

                    <PhonePreview page={{ title, bio, avatar_url: avatarUrl }} links={links} theme={theme} />

                    <div className="mt-8 flex gap-4">
                        <Button variant="outline" className="gap-2" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/links/${slug}`);
                            toast.success('Link copied');
                        }}>
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
