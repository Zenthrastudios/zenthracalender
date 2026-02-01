import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Instagram,
    MessageCircle,
    Send,
    Clock,
    Zap,
    Plus,
    Settings,
    Trash2,
    Edit,
    ExternalLink,
    CheckCircle,
    XCircle,
    AlertCircle,
    Image,
    Link2,
    BarChart3,
    RefreshCw,
    Play,
    Pause,
    FileText,
    Users,
    TrendingUp,
    MessageSquare,
    AtSign,
    Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Cast for new tables
const db = supabase as any;

interface InstagramIntegration {
    id: string;
    instagram_user_id: string;
    instagram_account_id: string;
    instagram_username: string;
    access_token: string;
    profile_picture_url: string | null;
    is_active: boolean;
    created_at: string;
}

interface AutomationRule {
    id: string;
    name: string;
    trigger_type: 'comment' | 'dm' | 'story_mention' | 'story_reply';
    trigger_keywords: string[] | null;
    response_type: 'dm' | 'comment_reply' | 'comment_reply_and_dm';
    response_message: string;
    dm_response_message?: string | null;
    response_image_url: string | null;
    response_button_text: string | null;
    response_button_url: string | null;
    media_id: string | null;
    is_active: boolean;
    created_at: string;
}

interface InstagramMedia {
    id: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    thumbnail_url?: string;
    caption: string;
    permalink: string;
    timestamp: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    message_text: string;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    category: string;
}

interface ScheduledMessage {
    id: string;
    message_text: string;
    scheduled_at: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    sent_at: string | null;
}

interface AutomationLog {
    id: string;
    event_type: string;
    trigger_content: string | null;
    response_sent: string | null;
    status: 'success' | 'failed';
    created_at: string;
}

export default function InstagramAutomation() {
    const { user, session } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const [showRuleDialog, setShowRuleDialog] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    // Form states
    const [ruleName, setRuleName] = useState('');
    const [triggerType, setTriggerType] = useState<string>('comment');
    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [responseType, setResponseType] = useState<string>('dm');
    const [responseMessage, setResponseMessage] = useState('');
    const [dmResponseMessage, setDmResponseMessage] = useState('');
    const [responseImageUrl, setResponseImageUrl] = useState('');
    const [responseButtonText, setResponseButtonText] = useState('');
    const [responseButtonUrl, setResponseButtonUrl] = useState('');

    const [templateName, setTemplateName] = useState('');
    const [templateMessage, setTemplateMessage] = useState('');
    const [templateImageUrl, setTemplateImageUrl] = useState('');
    const [templateButtonText, setTemplateButtonText] = useState('');
    const [templateButtonUrl, setTemplateButtonUrl] = useState('');

    const [scheduleMessage, setScheduleMessage] = useState('');
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [selectedMediaId, setSelectedMediaId] = useState<string>('');
    const [mediaSearch, setMediaSearch] = useState('');
    const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('ALL');
    const [mediaPage, setMediaPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Fetch integration
    const { data: integration, isLoading: integrationLoading } = useQuery({
        queryKey: ['instagram-integration', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await db
                .from('instagram_integrations')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();
            if (error) throw error;
            return data as InstagramIntegration | null;
        },
        enabled: !!user,
    });

    // Fetch automation rules
    const { data: rules = [], isLoading: rulesLoading } = useQuery({
        queryKey: ['instagram-rules', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await db
                .from('instagram_automation_rules')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as AutomationRule[];
        },
        enabled: !!user,
    });

    // Fetch templates
    const { data: templates = [] } = useQuery({
        queryKey: ['instagram-templates', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await db
                .from('instagram_message_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as MessageTemplate[];
        },
        enabled: !!user,
    });

    // Fetch Instagram media (posts/reels)
    const { data: media = [], isLoading: mediaLoading } = useQuery({
        queryKey: ['instagram-media', integration?.id],
        queryFn: async () => {
            if (!integration?.access_token) return [];
            try {
                const response = await fetch(
                    `https://graph.instagram.com/${integration.instagram_account_id}/media?fields=id,media_type,media_url,thumbnail_url,caption,permalink,timestamp&limit=50&access_token=${integration.access_token}`
                );
                const data = await response.json();
                if (data.error) {
                    console.error('Error fetching media:', data.error);
                    return [];
                }
                return (data.data || []) as InstagramMedia[];
            } catch (error) {
                console.error('Failed to fetch Instagram media:', error);
                return [];
            }
        },
        enabled: !!integration?.access_token,
    });

    // Fetch scheduled messages
    const { data: scheduledMessages = [] } = useQuery({
        queryKey: ['instagram-scheduled', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await db
                .from('instagram_scheduled_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('scheduled_at', { ascending: true });
            if (error) throw error;
            return data as ScheduledMessage[];
        },
        enabled: !!user,
    });

    // Fetch logs for analytics
    const { data: logs = [] } = useQuery({
        queryKey: ['instagram-logs', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await db
                .from('instagram_automation_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data as AutomationLog[];
        },
        enabled: !!user,
    });

    // Calculate stats
    const stats = {
        totalMessages: logs.filter(l => l.event_type === 'message_sent' || l.event_type === 'dm_sent').length,
        successRate: logs.length > 0
            ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)
            : 0,
        activeRules: rules.filter(r => r.is_active).length,
        pendingScheduled: scheduledMessages.filter(s => s.status === 'pending').length,
    };

    // Connect Instagram
    // Connect Instagram
    const initiateInstagramConnect = () => {
        if (!user || !session) {
            toast.error("You must be logged in to connect Instagram");
            return;
        }

        // We pass the Supabase Access Token as the state
        // This allows the Edge Function to verify the user identity
        const state = session.access_token;

        const PROJECT_REF = 'zlhbzlxxdezlrtzljpni';
        const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/instagram-auth`;
        const CLIENT_ID = '796387736858978';

        console.log('--- INSTAGRAM CONNECTION ATTEMPT ---');
        console.log('App ID:', CLIENT_ID);
        console.log('Redirect URI:', FUNCTION_URL);

        // Instagram Business Login scopes (NOT Facebook scopes)
        // As per Instagram Business Login documentation
        const scopes = [
            'instagram_business_basic',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_content_publish'
        ].join(',');

        const igUrl = `https://www.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(FUNCTION_URL)}&response_type=code&scope=${scopes}&state=${state}`;

        window.location.href = igUrl;
    };

    // Handle OAuth Callback Success/Error
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const error = params.get('error');

        if (success === 'true') {
            toast.success("Instagram connected successfully!");
            queryClient.invalidateQueries({ queryKey: ['instagram-integration'] });
            window.history.replaceState({}, '', window.location.pathname);
        } else if (error) {
            toast.error(`Instagram connection failed: ${error}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [queryClient]);

    // Disconnect Instagram
    const disconnectMutation = useMutation({
        mutationFn: async () => {
            if (!integration) return;
            const { error } = await db
                .from('instagram_integrations')
                .update({ is_active: false })
                .eq('id', integration.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-integration'] });
            toast.success('Instagram disconnected successfully');
        },
        onError: () => {
            toast.error('Failed to disconnect Instagram');
        },
    });

    // Save automation rule
    const saveRuleMutation = useMutation({
        mutationFn: async () => {
            if (!user || !integration) return;

            const ruleData = {
                user_id: user.id,
                integration_id: integration.id,
                name: ruleName,
                trigger_type: triggerType,
                trigger_keywords: tags.length > 0 ? tags : null,
                response_type: responseType,
                response_message: responseMessage,
                dm_response_message: responseType === 'comment_reply_and_dm' ? dmResponseMessage : null,
                response_image_url: responseImageUrl || null,
                response_button_text: responseButtonText || null,
                response_button_url: responseButtonUrl || null,
                media_id: selectedMediaId || null,
                is_active: true,
            };

            if (editingRule) {
                const { error } = await db
                    .from('instagram_automation_rules')
                    .update(ruleData)
                    .eq('id', editingRule.id);
                if (error) throw error;
            } else {
                const { error } = await db
                    .from('instagram_automation_rules')
                    .insert(ruleData);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-rules'] });
            toast.success(editingRule ? 'Rule updated!' : 'Rule created!');
            resetRuleForm();
            setShowRuleDialog(false);
        },
        onError: () => {
            toast.error('Failed to save rule');
        },
    });

    // Toggle rule active status
    const toggleRuleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await db
                .from('instagram_automation_rules')
                .update({ is_active: isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-rules'] });
        },
    });

    // Delete rule
    const deleteRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await db
                .from('instagram_automation_rules')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-rules'] });
            toast.success('Rule deleted');
        },
    });

    // Save template
    const saveTemplateMutation = useMutation({
        mutationFn: async () => {
            if (!user) return;

            const templateData = {
                user_id: user.id,
                name: templateName,
                message_text: templateMessage,
                image_url: templateImageUrl || null,
                button_text: templateButtonText || null,
                button_url: templateButtonUrl || null,
            };

            if (editingTemplate) {
                const { error } = await db
                    .from('instagram_message_templates')
                    .update(templateData)
                    .eq('id', editingTemplate.id);
                if (error) throw error;
            } else {
                const { error } = await db
                    .from('instagram_message_templates')
                    .insert(templateData);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-templates'] });
            toast.success(editingTemplate ? 'Template updated!' : 'Template created!');
            resetTemplateForm();
            setShowTemplateDialog(false);
        },
        onError: () => {
            toast.error('Failed to save template');
        },
    });

    // Schedule message
    const scheduleMessageMutation = useMutation({
        mutationFn: async () => {
            if (!user || !integration) return;

            const { error } = await db
                .from('instagram_scheduled_messages')
                .insert({
                    user_id: user.id,
                    integration_id: integration.id,
                    message_text: scheduleMessage,
                    scheduled_at: new Date(scheduleDateTime).toISOString(),
                    status: 'pending',
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-scheduled'] });
            toast.success('Message scheduled!');
            setScheduleMessage('');
            setScheduleDateTime('');
            setShowScheduleDialog(false);
        },
        onError: () => {
            toast.error('Failed to schedule message');
        },
    });

    const resetRuleForm = () => {
        setRuleName('');
        setTriggerType('comment');
        setTags([]);
        setInputValue('');
        setResponseType('dm');
        setResponseMessage('');
        setDmResponseMessage('');
        setResponseImageUrl('');
        setResponseButtonText('');
        setResponseButtonUrl('');
        setSelectedMediaId('');
        setEditingRule(null);
    };

    const resetTemplateForm = () => {
        setTemplateName('');
        setTemplateMessage('');
        setTemplateImageUrl('');
        setTemplateButtonText('');
        setTemplateButtonUrl('');
        setEditingTemplate(null);
    };

    const openEditRule = (rule: AutomationRule) => {
        setEditingRule(rule);
        setRuleName(rule.name);
        setTriggerType(rule.trigger_type);
        setTags(rule.trigger_keywords || []);
        setInputValue('');
        setResponseType(rule.response_type);
        setResponseMessage(rule.response_message);
        setDmResponseMessage(rule.dm_response_message || '');
        setResponseImageUrl(rule.response_image_url || '');
        setResponseButtonText(rule.response_button_text || '');
        setResponseButtonUrl(rule.response_button_url || '');
        setSelectedMediaId(rule.media_id || '');
        setShowRuleDialog(true);
    };

    const getTriggerIcon = (type: string) => {
        switch (type) {
            case 'comment': return <MessageCircle className="w-4 h-4" />;
            case 'dm': return <Send className="w-4 h-4" />;
            case 'story_mention': return <AtSign className="w-4 h-4" />;
            case 'story_reply': return <Heart className="w-4 h-4" />;
            default: return <Zap className="w-4 h-4" />;
        }
    };

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case 'comment': return 'Comment';
            case 'dm': return 'Direct Message';
            case 'story_mention': return 'Story Mention';
            case 'story_reply': return 'Story Reply';
            default: return type;
        }
    };

    if (integrationLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                <div className="mx-auto w-full max-w-7xl space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                                <Instagram className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Instagram Automation</h1>
                                <p className="text-muted-foreground text-sm">Automate DMs, comments & story replies</p>
                            </div>
                        </div>

                        {integration ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50">
                                    {integration.profile_picture_url ? (
                                        <img
                                            src={integration.profile_picture_url}
                                            alt={integration.instagram_username}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                    )}
                                    <span className="font-medium text-sm">@{integration.instagram_username}</span>
                                    <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-none h-5 px-1.5 text-[10px] uppercase tracking-wider">Connected</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-destructive h-8"
                                    onClick={() => disconnectMutation.mutate()}
                                >
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                onClick={initiateInstagramConnect}
                                className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90"
                            >
                                <Instagram className="w-4 h-4 mr-2" />
                                Connect
                            </Button>
                        )}
                    </div>

                    {!integration ? (
                        /* Not Connected State */
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-400/20 flex items-center justify-center mb-6">
                                    <Instagram className="w-10 h-10 text-pink-500" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">Connect Your Instagram Account</h2>
                                <p className="text-muted-foreground max-w-md mb-6">
                                    Link your Instagram Business or Creator account to enable automated DMs,
                                    comment replies, and story interactions.
                                </p>
                                <div className="flex flex-col gap-3 text-left text-sm text-muted-foreground mb-6">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span>Auto-reply to comments with keywords</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span>Send DMs when users comment or mention you</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span>Schedule automated messages</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span>Use templates with images & buttons</span>
                                    </div>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={initiateInstagramConnect}
                                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90"
                                >
                                    <Instagram className="w-5 h-5 mr-2" />
                                    Connect Instagram Account
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Connected - Show Full Dashboard */
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="mb-6">
                                <TabsTrigger value="overview" className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="rules" className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Automation Rules
                                </TabsTrigger>
                                <TabsTrigger value="templates" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Templates
                                </TabsTrigger>
                                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Scheduled
                                </TabsTrigger>
                                <TabsTrigger value="logs" className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Activity
                                </TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="p-2 rounded-lg bg-blue-500/10 w-fit">
                                                <Send className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-3">Messages Sent</p>
                                            <p className="text-2xl font-bold mt-1">{stats.totalMessages}</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="p-2 rounded-lg bg-green-500/10 w-fit">
                                                <TrendingUp className="h-5 w-5 text-green-500" />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-3">Success Rate</p>
                                            <p className="text-2xl font-bold mt-1">{stats.successRate}%</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="p-2 rounded-lg bg-purple-500/10 w-fit">
                                                <Zap className="h-5 w-5 text-purple-500" />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-3">Active Rules</p>
                                            <p className="text-2xl font-bold mt-1">{stats.activeRules}</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="p-2 rounded-lg bg-orange-500/10 w-fit">
                                                <Clock className="h-5 w-5 text-orange-500" />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-3">Scheduled</p>
                                            <p className="text-2xl font-bold mt-1">{stats.pendingScheduled}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                <Plus className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Create Automation Rule</h3>
                                                <p className="text-sm text-muted-foreground">Set up auto-replies</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { resetTemplateForm(); setShowTemplateDialog(true); }}>
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Create Template</h3>
                                                <p className="text-sm text-muted-foreground">Save reusable messages</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowScheduleDialog(true)}>
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                                                <Clock className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Schedule Message</h3>
                                                <p className="text-sm text-muted-foreground">Send at specific time</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Recent Activity */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Recent Activity</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {logs.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p>No activity yet. Create an automation rule to get started!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {logs.slice(0, 5).map((log) => (
                                                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                                            log.status === 'success' ? "bg-green-500/20" : "bg-red-500/20"
                                                        )}>
                                                            {log.status === 'success' ? (
                                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-red-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {log.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {log.response_sent || log.trigger_content || 'No details'}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(log.created_at), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Automation Rules Tab */}
                            <TabsContent value="rules" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold">Automation Rules</h2>
                                        <p className="text-sm text-muted-foreground">Set up triggers and automatic responses</p>
                                    </div>
                                    <Button onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Rule
                                    </Button>
                                </div>

                                {rules.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                            <Zap className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                            <h3 className="font-semibold mb-1">No automation rules yet</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Create your first rule to start automating</p>
                                            <Button onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Rule
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-4">
                                        {rules.map((rule) => (
                                            <Card key={rule.id} className={cn(!rule.is_active && "opacity-60")}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                                                rule.trigger_type === 'comment' && "bg-blue-500/20 text-blue-500",
                                                                rule.trigger_type === 'dm' && "bg-green-500/20 text-green-500",
                                                                rule.trigger_type === 'story_mention' && "bg-purple-500/20 text-purple-500",
                                                                rule.trigger_type === 'story_reply' && "bg-pink-500/20 text-pink-500"
                                                            )}>
                                                                {getTriggerIcon(rule.trigger_type)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold">{rule.name}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {getTriggerLabel(rule.trigger_type)}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground">→</span>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {rule.response_type === 'dm' ? 'Send DM' : 'Reply'}
                                                                    </Badge>
                                                                </div>
                                                                {rule.trigger_keywords && rule.trigger_keywords.length > 0 && (
                                                                    <p className="text-xs text-muted-foreground mt-2">
                                                                        Keywords: {rule.trigger_keywords.join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={rule.is_active}
                                                                onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                                                            />
                                                            <Button variant="ghost" size="icon" onClick={() => openEditRule(rule)}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive"
                                                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Templates Tab */}
                            <TabsContent value="templates" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold">Message Templates</h2>
                                        <p className="text-sm text-muted-foreground">Reusable messages with images and buttons</p>
                                    </div>
                                    <Button onClick={() => { resetTemplateForm(); setShowTemplateDialog(true); }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Template
                                    </Button>
                                </div>

                                {templates.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                            <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                            <h3 className="font-semibold mb-1">No templates yet</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Create templates for quick responses</p>
                                            <Button onClick={() => { resetTemplateForm(); setShowTemplateDialog(true); }}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Template
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {templates.map((template) => (
                                            <Card key={template.id} className="hover:border-primary/30 transition-colors">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h3 className="font-semibold">{template.name}</h3>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => {
                                                                    setEditingTemplate(template);
                                                                    setTemplateName(template.name);
                                                                    setTemplateMessage(template.message_text);
                                                                    setTemplateImageUrl(template.image_url || '');
                                                                    setTemplateButtonText(template.button_text || '');
                                                                    setTemplateButtonUrl(template.button_url || '');
                                                                    setShowTemplateDialog(true);
                                                                }}
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => {
                                                                    if (confirm('Delete this template?')) {
                                                                        db.from('instagram_message_templates').delete().eq('id', template.id).then(() => {
                                                                            queryClient.invalidateQueries({ queryKey: ['instagram-templates'] });
                                                                            toast.success('Template deleted');
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-3">{template.message_text}</p>
                                                    <div className="flex gap-2 mt-3">
                                                        {template.image_url && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <Image className="w-3 h-3 mr-1" />
                                                                Image
                                                            </Badge>
                                                        )}
                                                        {template.button_text && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <Link2 className="w-3 h-3 mr-1" />
                                                                Button
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Scheduled Tab */}
                            <TabsContent value="scheduled" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold">Scheduled Messages</h2>
                                        <p className="text-sm text-muted-foreground">Messages queued to send at specific times</p>
                                    </div>
                                    <Button onClick={() => setShowScheduleDialog(true)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Schedule Message
                                    </Button>
                                </div>

                                {scheduledMessages.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                            <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                            <h3 className="font-semibold mb-1">No scheduled messages</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Schedule messages to send later</p>
                                            <Button onClick={() => setShowScheduleDialog(true)}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Schedule Message
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Message</TableHead>
                                                <TableHead>Scheduled For</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {scheduledMessages.map((msg) => (
                                                <TableRow key={msg.id}>
                                                    <TableCell className="max-w-xs truncate">{msg.message_text}</TableCell>
                                                    <TableCell>{format(new Date(msg.scheduled_at), 'MMM d, h:mm a')}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            msg.status === 'sent' ? 'default' :
                                                                msg.status === 'pending' ? 'secondary' :
                                                                    msg.status === 'failed' ? 'destructive' : 'outline'
                                                        }>
                                                            {msg.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {msg.status === 'pending' && (
                                                            <Button variant="ghost" size="sm" className="text-destructive">
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>

                            {/* Logs/Activity Tab */}
                            <TabsContent value="logs" className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold">Activity Log</h2>
                                    <p className="text-sm text-muted-foreground">Recent automation events and message history</p>
                                </div>

                                {logs.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                            <h3 className="font-semibold mb-1">No activity yet</h3>
                                            <p className="text-sm text-muted-foreground">Activity will appear here when automations run</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Event</TableHead>
                                                <TableHead>Details</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">
                                                        {log.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-muted-foreground">
                                                        {log.response_sent || log.trigger_content || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>

            {/* Create/Edit Rule Dialog */}
            <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                <DialogContent className="max-w-[95vw] lg:max-w-[90vw] max-h-[90vh] p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</DialogTitle>
                        <DialogDescription className="text-sm">
                            Set up automatic responses when specific triggers occur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col lg:flex-row gap-4 py-4 overflow-hidden">
                        {/* Left Sidebar - Media Selector (only for comment triggers) */}
                        {triggerType === 'comment' && media.length > 0 && (
                            <div className="w-full lg:w-80 flex-shrink-0 lg:border-r lg:pr-6 mb-4 lg:mb-0">
                                <Label className="mb-3 block text-sm sm:text-base">Select Post/Reel</Label>
                                {/* Search and Filter */}
                                <div className="space-y-2 mb-4">
                                    <Input
                                        placeholder="Search by caption..."
                                        value={mediaSearch}
                                        onChange={(e) => {
                                            setMediaSearch(e.target.value);
                                            setMediaPage(1);
                                        }}
                                        className="h-8 text-xs"
                                    />
                                    <Select
                                        value={mediaTypeFilter}
                                        onValueChange={(val) => {
                                            setMediaTypeFilter(val);
                                            setMediaPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All Media Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Posts</SelectItem>
                                            <SelectItem value="IMAGE">Images</SelectItem>
                                            <SelectItem value="VIDEO">Videos/Reels</SelectItem>
                                            <SelectItem value="CAROUSEL_ALBUM">Carousels</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto pr-2">
                                    <div
                                        onClick={() => setSelectedMediaId('')}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                            !selectedMediaId ? "bg-primary/10 border-2 border-primary" : "hover:bg-muted/50 border border-border"
                                        )}
                                    >
                                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                            <span className="text-2xl">✨</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">All Posts</p>
                                            <p className="text-xs text-muted-foreground">Any post</p>
                                        </div>
                                    </div>

                                    {media
                                        .filter(item => {
                                            const matchesSearch = (item.caption || '').toLowerCase().includes(mediaSearch.toLowerCase());
                                            const matchesType = mediaTypeFilter === 'ALL' || item.media_type === mediaTypeFilter;
                                            return matchesSearch && matchesType;
                                        })
                                        .slice((mediaPage - 1) * ITEMS_PER_PAGE, mediaPage * ITEMS_PER_PAGE)
                                        .map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedMediaId(item.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                                    selectedMediaId === item.id ? "bg-primary/10 border-2 border-primary" : "hover:bg-muted/50 border border-border"
                                                )}
                                            >
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                                    <img
                                                        src={item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url}
                                                        alt={item.caption || 'Post'}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl">${item.media_type === 'VIDEO' ? '🎥' : '📷'}</div>`;
                                                        }}
                                                    />
                                                    {item.media_type === 'VIDEO' && (
                                                        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                                            VIDEO
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium line-clamp-2">
                                                        {item.caption || 'No caption'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(item.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex items-center justify-between mt-4 px-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMediaPage(p => Math.max(1, p - 1))}
                                        disabled={mediaPage === 1}
                                        className="h-7 text-xs"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Page {mediaPage}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMediaPage(p => p + 1)}
                                        disabled={media.filter(item => {
                                            const matchesSearch = (item.caption || '').toLowerCase().includes(mediaSearch.toLowerCase());
                                            const matchesType = mediaTypeFilter === 'ALL' || item.media_type === mediaTypeFilter;
                                            return matchesSearch && matchesType;
                                        }).length <= mediaPage * ITEMS_PER_PAGE}
                                        className="h-7 text-xs"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Center - Form Fields */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[50vh] lg:max-h-[60vh]">
                            <div>
                                <Label>Rule Name</Label>
                                <Input
                                    placeholder="e.g., Welcome DM for new comments"
                                    value={ruleName}
                                    onChange={(e) => setRuleName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Trigger Type</Label>
                                    <Select value={triggerType} onValueChange={setTriggerType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="comment">Comment on Post</SelectItem>
                                            <SelectItem value="dm">Direct Message</SelectItem>
                                            <SelectItem value="story_mention">Story Mention</SelectItem>
                                            <SelectItem value="story_reply">Story Reply</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Response Type</Label>
                                    <Select value={responseType} onValueChange={setResponseType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dm">Send DM</SelectItem>
                                            <SelectItem value="comment_reply">Reply to Comment</SelectItem>
                                            <SelectItem value="comment_reply_and_dm">Reply to Comment & Send DM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Trigger Keywords (optional)</Label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[42px]">
                                    {tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1 h-7">
                                            {tag}
                                            <button
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const newTags = [...tags];
                                                        newTags.splice(index, 1);
                                                        setTags(newTags);
                                                    }
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onClick={() => {
                                                    const newTags = [...tags];
                                                    newTags.splice(index, 1);
                                                    setTags(newTags);
                                                }}
                                            >
                                                <XCircle className="h-3 w-3 hover:text-destructive" />
                                                <span className="sr-only">Remove {tag}</span>
                                            </button>
                                        </Badge>
                                    ))}
                                    <input
                                        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm min-w-[120px]"
                                        placeholder={tags.length === 0 ? "Type keyword and press Enter or Space..." : ""}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' || e.key === ' ') && inputValue.trim()) {
                                                e.preventDefault();
                                                if (!tags.includes(inputValue.trim())) {
                                                    setTags([...tags, inputValue.trim()]);
                                                }
                                                setInputValue('');
                                            }
                                            if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
                                                setTags(tags.slice(0, -1));
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Press Enter or Space to add a keyword. Leave empty to trigger on all {triggerType}s.
                                </p>
                            </div>


                            <div>
                                <Label>Use Template (optional)</Label>
                                {templates.length > 0 ? (
                                    <>
                                        <Select onValueChange={(templateId) => {
                                            const template = templates.find(t => t.id === templateId);
                                            if (template) {
                                                setResponseMessage(template.message_text);
                                                setResponseImageUrl(template.image_url || '');
                                            }
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a template..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Select a template to auto-fill the message
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground py-2">
                                        No templates yet. Create templates in the Templates tab to use them here.
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>{responseType === 'comment_reply_and_dm' ? 'Comment Reply Message' : 'Response Message'}</Label>
                                <Textarea
                                    placeholder="Hi! Thanks for reaching out..."
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    rows={responseType === 'comment_reply_and_dm' ? 3 : 4}
                                />
                            </div>

                            {responseType === 'comment_reply_and_dm' && (
                                <div>
                                    <Label>DM Message Content</Label>
                                    <Textarea
                                        placeholder="Here is the info you asked for..."
                                        value={dmResponseMessage}
                                        onChange={(e) => setDmResponseMessage(e.target.value)}
                                        rows={4}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">This message will be sent to their DMs.</p>
                                </div>
                            )}

                            <div>
                                <Label>Image URL (optional)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={responseImageUrl}
                                    onChange={(e) => setResponseImageUrl(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Button Text (optional)</Label>
                                    <Input
                                        placeholder="Learn More"
                                        value={responseButtonText}
                                        onChange={(e) => setResponseButtonText(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Button URL (optional)</Label>
                                    <Input
                                        placeholder="https://..."
                                        value={responseButtonUrl}
                                        onChange={(e) => setResponseButtonUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar - Message Preview */}
                        {(responseMessage || dmResponseMessage) && (
                            <div className="w-full lg:w-96 flex-shrink-0 lg:border-l lg:pl-6 mt-4 lg:mt-0">
                                <Label className="mb-3 block text-sm sm:text-base">Message Preview</Label>
                                <div className="space-y-4 max-h-[40vh] lg:max-h-[60vh] overflow-y-auto pr-2">
                                    {/* Instagram DM Preview */}
                                    <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-4 text-white">
                                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                <span className="text-white text-xs font-semibold">
                                                    {integration?.instagram_username?.charAt(0).toUpperCase() || 'B'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">@{integration?.instagram_username || 'your_account'}</p>
                                                <p className="text-xs text-gray-400">Active now</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Message Bubble */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%] space-y-2">
                                                    <div className="bg-blue-600 rounded-3xl rounded-tr-md px-4 py-2.5">
                                                        <p className="text-sm text-white whitespace-pre-wrap break-words">
                                                            {responseType === 'comment_reply_and_dm' ? (dmResponseMessage || 'Type DM message...') : responseMessage}
                                                        </p>
                                                    </div>

                                                    {/* Image */}
                                                    {responseImageUrl && (
                                                        <div className="relative w-full rounded-2xl overflow-hidden bg-gray-800">
                                                            <img
                                                                src={responseImageUrl}
                                                                alt="Preview"
                                                                className="w-full h-auto max-h-64 object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-32 flex items-center justify-center text-gray-500 text-xs">Image unavailable</div>';
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Button */}
                                                    {responseButtonText && responseButtonUrl && (
                                                        <div className="bg-gray-800 rounded-2xl p-3 border border-gray-700">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <p className="text-xs text-gray-400 mb-0.5 truncate">{responseButtonUrl}</p>
                                                                    <p className="text-sm font-medium text-white break-words">{responseButtonText}</p>
                                                                </div>
                                                                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-500 text-right">Just now</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground space-y-1 px-2">
                                        <p className="font-medium">Preview includes:</p>
                                        <ul className="space-y-1 list-disc list-inside">
                                            <li>Message text</li>
                                            {responseImageUrl && <li>Image attachment</li>}
                                            {responseButtonText && <li>Action button link</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
                        <Button onClick={() => saveRuleMutation.mutate()} disabled={!ruleName || !responseMessage}>
                            {editingRule ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Template Dialog */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                        <DialogDescription className="text-sm">
                            Save reusable message templates with optional images and buttons.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 py-4 overflow-hidden">
                        {/* Left Side - Form Fields */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[50vh] lg:max-h-[60vh]">
                            <div>
                                <Label>Template Name</Label>
                                <Input
                                    placeholder="e.g., Welcome Message"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Message</Label>
                                <Textarea
                                    placeholder="Your message content..."
                                    value={templateMessage}
                                    onChange={(e) => setTemplateMessage(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div>
                                <Label>Image URL (optional)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={templateImageUrl}
                                    onChange={(e) => setTemplateImageUrl(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Button Text (optional)</Label>
                                    <Input
                                        placeholder="Learn More"
                                        value={templateButtonText}
                                        onChange={(e) => setTemplateButtonText(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Button URL</Label>
                                    <Input
                                        placeholder="https://..."
                                        value={templateButtonUrl}
                                        onChange={(e) => setTemplateButtonUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Template Preview */}
                        {templateMessage && (
                            <div className="w-full lg:w-96 flex-shrink-0 lg:border-l lg:pl-6 mt-4 lg:mt-0">
                                <Label className="mb-3 block text-sm sm:text-base">Template Preview</Label>
                                <div className="space-y-4 max-h-[40vh] lg:max-h-[60vh] overflow-y-auto pr-2">
                                    {/* Instagram DM Preview */}
                                    <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-4 text-white">
                                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                <span className="text-white text-xs font-semibold">
                                                    {integration?.instagram_username?.charAt(0).toUpperCase() || 'B'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">@{integration?.instagram_username || 'your_account'}</p>
                                                <p className="text-xs text-gray-400">Active now</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Message Bubble */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%] space-y-2">
                                                    <div className="bg-blue-600 rounded-3xl rounded-tr-md px-4 py-2.5">
                                                        <p className="text-sm text-white whitespace-pre-wrap break-words">{templateMessage}</p>
                                                    </div>

                                                    {/* Image */}
                                                    {templateImageUrl && (
                                                        <div className="relative w-full rounded-2xl overflow-hidden bg-gray-800">
                                                            <img
                                                                src={templateImageUrl}
                                                                alt="Preview"
                                                                className="w-full h-auto max-h-64 object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-32 flex items-center justify-center text-gray-500 text-xs">Image unavailable</div>';
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Button */}
                                                    {templateButtonText && templateButtonUrl && (
                                                        <div className="bg-gray-800 rounded-2xl p-3 border border-gray-700">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-gray-400 mb-1">Link</p>
                                                                    <p className="text-sm font-medium text-white">{templateButtonText}</p>
                                                                </div>
                                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-500 text-right">Just now</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground space-y-1 px-2">
                                        <p className="font-medium">Template includes:</p>
                                        <ul className="space-y-1 list-disc list-inside">
                                            <li>Message text</li>
                                            {templateImageUrl && <li>Image attachment</li>}
                                            {templateButtonText && <li>Action button link</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
                        <Button onClick={() => saveTemplateMutation.mutate()} disabled={!templateName || !templateMessage}>
                            {editingTemplate ? 'Update' : 'Create'} Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule Message Dialog */}
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Schedule Message</DialogTitle>
                        <DialogDescription>
                            Schedule a message to be sent at a specific time.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Message</Label>
                            <Textarea
                                placeholder="Your message..."
                                value={scheduleMessage}
                                onChange={(e) => setScheduleMessage(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div>
                            <Label>Schedule For</Label>
                            <Input
                                type="datetime-local"
                                value={scheduleDateTime}
                                onChange={(e) => setScheduleDateTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
                        <Button onClick={() => scheduleMessageMutation.mutate()} disabled={!scheduleMessage || !scheduleDateTime}>
                            Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout >
    );
}
