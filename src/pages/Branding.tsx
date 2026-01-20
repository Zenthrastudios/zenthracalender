import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings, useUpdateBrandingSettings, useUploadBrandLogo } from '@/hooks/useBrandingSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Palette, Image as ImageIcon, Globe, Loader2, Save, Trash2, Layout, Mail, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BrandingPage() {
    const { user } = useAuth();
    const { data: settings, isLoading } = useBrandingSettings();
    const updateSettings = useUpdateBrandingSettings();
    const uploadLogo = useUploadBrandLogo();
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        brand_name: '',
        brand_logo_url: '',
        brand_color: '#111827',
        site_url: '',
        is_enabled: true
    });

    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                brand_name: settings.brand_name || 'CalSchedule',
                brand_logo_url: settings.brand_logo_url || '',
                brand_color: settings.brand_color || '#111827',
                site_url: settings.site_url || '',
                is_enabled: settings.is_enabled ?? true
            });
        }
    }, [settings]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            await updateSettings.mutateAsync(formData);
            toast.success('Branding settings saved!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        setIsUploading(true);
        try {
            const publicUrl = await uploadLogo.mutateAsync({ userId: user.id, file });
            setFormData(prev => ({ ...prev, brand_logo_url: publicUrl }));
            toast.success('Logo uploaded!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload logo');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
                    <p className="text-muted-foreground mt-1">
                        Customize how your brand appears on public pages and emails.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Layout className="w-5 h-5 text-primary" />
                                    General Branding
                                </CardTitle>
                                <CardDescription>
                                    Set your brand name and logo that attendees will see.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="brand-name">Brand Name</Label>
                                    <Input
                                        id="brand-name"
                                        placeholder="e.g. Acme Inc"
                                        value={formData.brand_name}
                                        onChange={e => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This will replace "CalSchedule" on your public pages and in emails.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="site-url">Primary Domain (App URL)</Label>
                                    <Input
                                        id="site-url"
                                        placeholder="https://cal.zenthrashop.in"
                                        value={formData.site_url}
                                        onChange={e => setFormData(prev => ({ ...prev, site_url: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The base URL for all booking links and confirmation pages.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Label>Brand Logo</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                                            {formData.brand_logo_url ? (
                                                <img src={formData.brand_logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => logoInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {formData.brand_logo_url ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            {formData.brand_logo_url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setFormData(prev => ({ ...prev, brand_logo_url: '' }))}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Remove
                                                </Button>
                                            )}
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-primary" />
                                    Appearance
                                </CardTitle>
                                <CardDescription>
                                    Customize colors to match your brand identity.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="brand-color">Primary Brand Color</Label>
                                        <span className="text-xs font-mono text-muted-foreground uppercase">{formData.brand_color}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <Input
                                            id="brand-color"
                                            type="color"
                                            className="w-20 h-10 p-1 cursor-pointer"
                                            value={formData.brand_color}
                                            onChange={e => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
                                        />
                                        <Input
                                            type="text"
                                            className="flex-1 font-mono"
                                            value={formData.brand_color}
                                            onChange={e => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Enable Custom Branding</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Switch off to use default CalSchedule branding.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.is_enabled}
                                        onCheckedChange={checked => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t py-4">
                                <Button onClick={handleSave} disabled={updateSettings.isPending} className="ml-auto">
                                    {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Branding
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Live Preview</h3>

                        <div className="space-y-4">
                            <p className="text-sm font-medium flex items-center gap-2 italic">
                                <MousePointer2 className="w-4 h-4" />
                                Public Booking Page
                            </p>
                            <div className="bg-background border rounded-xl shadow-sm overflow-hidden pointer-events-none scale-95 origin-top transition-all">
                                <div className="p-3 border-b flex items-center justify-between bg-card">
                                    <div className="flex items-center gap-1.5">
                                        {formData.is_enabled && formData.brand_logo_url ? (
                                            <img src={formData.brand_logo_url} alt="Logo" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center">
                                                <div className="w-3 h-3 bg-background rounded-sm" />
                                            </div>
                                        )}
                                        <span className="font-bold text-xs">
                                            {formData.is_enabled ? formData.brand_name || 'CalSchedule' : 'CalSchedule'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">Powered by CalSchedule</div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                                        <div className="space-y-1">
                                            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                                            <div className="h-2 w-12 bg-muted/60 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
                                        <div className="space-y-2">
                                            <div className="h-8 bg-muted rounded-md animate-pulse" />
                                            <div className="h-8 bg-muted rounded-md animate-pulse" />
                                            <div
                                                className="h-8 rounded-md"
                                                style={{ backgroundColor: formData.is_enabled ? formData.brand_color : 'hsl(var(--primary))', opacity: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm font-medium flex items-center gap-2 italic mt-8">
                                <Mail className="w-4 h-4" />
                                Email Notification
                            </p>
                            <div className="bg-[#0B1220] p-4 rounded-xl pointer-events-none scale-95 origin-top transition-all">
                                <div className="bg-[#0F172A] border border-white/10 rounded-lg overflow-hidden">
                                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-white font-bold text-xs">
                                            {formData.is_enabled ? formData.brand_name || 'CalSchedule' : 'CalSchedule'}
                                        </span>
                                        {formData.is_enabled && (
                                            <div
                                                className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full"
                                                style={{ backgroundColor: formData.brand_color }}
                                            >
                                                CONFIRMED
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="h-4 w-1/2 bg-white/10 rounded" />
                                        <div className="h-16 w-full bg-white/5 rounded-lg border border-white/5" />
                                        <div
                                            className="h-8 w-1/3 rounded-lg"
                                            style={{ backgroundColor: formData.is_enabled ? formData.brand_color : '#111827' }}
                                        />
                                    </div>
                                </div>
                                <div className="text-center mt-2 text-[8px] text-gray-500">
                                    Powered by {formData.is_enabled ? formData.brand_name || 'CalSchedule' : 'CalSchedule'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
