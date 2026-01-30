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
    instagram_username: string;
    profile_picture_url: string | null;
    is_active: boolean;
    created_at: string;
}

interface AutomationRule {
    id: string;
    name: string;
    trigger_type: 'comment' | 'dm' | 'story_mention' | 'story_reply';
    trigger_keywords: string[] | null;
    response_type: 'dm' | 'comment_reply';
    response_message: string;
    response_image_url: string | null;
    is_active: boolean;
    created_at: string;
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
    const { user } = useAuth();
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
    const [triggerKeywords, setTriggerKeywords] = useState('');
    const [responseType, setResponseType] = useState<string>('dm');
    const [responseMessage, setResponseMessage] = useState('');
    const [responseImageUrl, setResponseImageUrl] = useState('');

    const [templateName, setTemplateName] = useState('');
    const [templateMessage, setTemplateMessage] = useState('');
    const [templateImageUrl, setTemplateImageUrl] = useState('');
    const [templateButtonText, setTemplateButtonText] = useState('');
    const [templateButtonUrl, setTemplateButtonUrl] = useState('');

    const [scheduleMessage, setScheduleMessage] = useState('');
    const [scheduleDateTime, setScheduleDateTime] = useState('');

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
    const handleConnectInstagram = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            toast.error("You must be logged in to connect Instagram");
            return;
        }

        // We use the 'state' parameter to pass the Supabase JWT to the callback function
        // This allows the backend to authenticate the user and link the account
        // Note: In production, consider encrypting this or using a temporary code exchange if security is critical
        const state = session.access_token;

        // Supabase Function URL
        // Typically: https://<project-ref>.supabase.co/functions/v1/instagram-auth/callback
        // BUT we need to redirect to FACEBOOK first.

        // We can construct the FB URL here or call the function to get it.
        // Let's construct it here to avoid an extra RTT, using the Function URL as the redirect_uri
        const PROJECT_REF = 'zlhbzlxxdezlrtzljpni'; // Hardcoded for now based on context
        const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/instagram-auth`;
        const CLIENT_ID = '796387736858978'; // Updated App ID

        // Use Instagram OAuth URL for "Instagram App" types
        // Note: The scopes here are different for the new Instagram API setup
        // Note: The scopes here must include page permissions to find the linked Business Account
        const fbUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${CLIENT_ID}&redirect_uri=${FUNCTION_URL}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights,pages_show_list,pages_read_engagement&state=${state}`;

        console.log('Redirecting to:', fbUrl);
        window.location.href = fbUrl;
    };

    // Handle OAuth Callback Success/Error
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const error = params.get('error');

        if (success === 'true') {
            toast.success("Instagram connected successfully!");
            queryClient.invalidateQueries({ queryKey: ['instagram-integration'] });
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (error) {
            toast.error(`Instagram connection failed: ${error}`);
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
                trigger_keywords: triggerKeywords ? triggerKeywords.split(',').map(k => k.trim()) : null,
                response_type: responseType,
                response_message: responseMessage,
                response_image_url: responseImageUrl || null,
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
        setTriggerKeywords('');
        setResponseType('dm');
        setResponseMessage('');
        setResponseImageUrl('');
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
        setTriggerKeywords(rule.trigger_keywords?.join(', ') || '');
        setResponseType(rule.response_type);
        setResponseMessage(rule.response_message);
        setResponseImageUrl(rule.response_image_url || '');
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

                        {integration && (
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
                                    onClick={handleConnectInstagram}
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
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</DialogTitle>
                        <DialogDescription>
                            Set up automatic responses when specific triggers occur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
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
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Trigger Keywords (optional)</Label>
                            <Input
                                placeholder="price, info, details (comma separated)"
                                value={triggerKeywords}
                                onChange={(e) => setTriggerKeywords(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Leave empty to trigger on all {triggerType}s
                            </p>
                        </div>

                        <div>
                            <Label>Response Message</Label>
                            <Textarea
                                placeholder="Hi! Thanks for reaching out..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div>
                            <Label>Image URL (optional)</Label>
                            <Input
                                placeholder="https://..."
                                value={responseImageUrl}
                                onChange={(e) => setResponseImageUrl(e.target.value)}
                            />
                        </div>
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                        <DialogDescription>
                            Save reusable message templates with optional images and buttons.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
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
        </DashboardLayout>
    );
}
