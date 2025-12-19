import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useIntegrations, useConnectGoogle, useDisconnectIntegration } from '@/hooks/useIntegrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Calendar, 
  Video, 
  Mail, 
  Zap, 
  ExternalLink,
  Check,
  AlertCircle,
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'calendar' | 'conferencing' | 'email' | 'automation';
  provider: string | null; // Maps to database provider
  connected: boolean;
  popular?: boolean;
  features: string[];
  connectedEmail?: string | null;
}

const BASE_INTEGRATIONS: Omit<AppIntegration, 'connected' | 'connectedEmail'>[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync your bookings with Google Calendar to avoid double-bookings and see all events in one place.',
    icon: <Calendar className="w-6 h-6 text-blue-500" />,
    category: 'calendar',
    provider: 'google',
    popular: true,
    features: [
      'Two-way calendar sync',
      'Automatic busy time detection',
      'Add bookings to your calendar',
      'Check for conflicts before booking',
    ],
  },
  {
    id: 'google-meet',
    name: 'Google Meet',
    description: 'Automatically create Google Meet video conferencing links for your bookings.',
    icon: <Video className="w-6 h-6 text-green-500" />,
    category: 'conferencing',
    provider: 'google', // Uses same Google OAuth
    popular: true,
    features: [
      'Auto-generate meeting links',
      'Add to calendar invites',
      'No extra software needed',
      'Works with Google Workspace',
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send booking confirmations and reminders through your Gmail account.',
    icon: <Mail className="w-6 h-6 text-red-500" />,
    category: 'email',
    provider: 'google', // Uses same Google OAuth
    features: [
      'Custom email templates',
      'Send from your email address',
      'Email tracking',
      'Automatic reminders',
    ],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Create Zoom meeting links automatically when attendees book a video call.',
    icon: <Video className="w-6 h-6 text-blue-600" />,
    category: 'conferencing',
    provider: null, // Not yet implemented
    popular: true,
    features: [
      'Auto-generate Zoom links',
      'Use personal meeting room',
      'Waiting room support',
      'Meeting recordings',
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    description: 'Connect your Microsoft Outlook calendar for seamless scheduling.',
    icon: <Calendar className="w-6 h-6 text-blue-700" />,
    category: 'calendar',
    provider: null, // Not yet implemented
    features: [
      'Two-way sync with Outlook',
      'Microsoft 365 integration',
      'Teams meeting support',
      'Shared calendar support',
    ],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5000+ apps with automated workflows triggered by your bookings.',
    icon: <Zap className="w-6 h-6 text-orange-500" />,
    category: 'automation',
    provider: null, // Not yet implemented
    features: [
      'Connect to 5000+ apps',
      'Trigger on new bookings',
      'Automate follow-ups',
      'Custom workflows',
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Apps' },
  { id: 'calendar', label: 'Calendars' },
  { id: 'conferencing', label: 'Video Conferencing' },
  { id: 'email', label: 'Email' },
  { id: 'automation', label: 'Automation' },
];

export default function Apps() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: integrations, isLoading } = useIntegrations();
  const connectGoogle = useConnectGoogle();
  const disconnectIntegration = useDisconnectIntegration();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedApp, setSelectedApp] = useState<AppIntegration | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    
    if (connected === 'google') {
      toast.success('Google connected successfully!');
      // Clear params from URL
      window.history.replaceState({}, '', '/dashboard/apps');
    } else if (error) {
      toast.error('Failed to connect. Please try again.');
      window.history.replaceState({}, '', '/dashboard/apps');
    }
  }, [searchParams]);

  // Build apps list with connection status
  const apps: AppIntegration[] = BASE_INTEGRATIONS.map(app => {
    const integration = integrations?.find(i => i.provider === app.provider);
    return {
      ...app,
      connected: !!integration,
      connectedEmail: integration?.provider_email,
    };
  });

  const filteredApps = selectedCategory === 'all' 
    ? apps 
    : apps.filter(app => app.category === selectedCategory);

  const connectedApps = apps.filter(app => app.connected);

  const handleConnect = async (app: AppIntegration) => {
    if (!app.provider) {
      toast.info(`${app.name} integration coming soon!`);
      return;
    }

    if (app.provider === 'google') {
      setIsConnecting(true);
      try {
        const authUrl = await connectGoogle.mutateAsync();
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } catch (error: any) {
        console.error('Connect error:', error);
        toast.error(error.message || 'Failed to start connection');
        setIsConnecting(false);
      }
    }
  };

  const handleDisconnect = async (app: AppIntegration) => {
    if (!app.provider) return;

    try {
      await disconnectIntegration.mutateAsync(app.provider);
      setSelectedApp(null);
      toast.success(`${app.name} disconnected`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold">Apps & Integrations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Connect your favorite tools to enhance your scheduling</p>
        </div>

        {/* Connected Apps Summary */}
        {connectedApps.length > 0 && (
          <div className="mb-6 sm:mb-8 p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-medium text-sm sm:text-base">Connected Apps ({connectedApps.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {connectedApps.map(app => (
                <div 
                  key={app.id} 
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/50 border border-border text-sm"
                >
                  <span className="shrink-0">{app.icon}</span>
                  <span className="font-medium">{app.name}</span>
                  {app.connectedEmail && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">
                      {app.connectedEmail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Apps Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredApps.map(app => (
              <div
                key={app.id}
                className={cn(
                  "p-4 sm:p-5 bg-card rounded-xl border transition-all hover:shadow-md cursor-pointer group",
                  app.connected 
                    ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
                    : "border-border hover:border-primary/30",
                  !app.provider && "opacity-70"
                )}
                onClick={() => setSelectedApp(app)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={cn(
                    "p-2.5 sm:p-3 rounded-lg border shrink-0",
                    app.connected 
                      ? "bg-white dark:bg-background border-emerald-200 dark:border-emerald-800/50" 
                      : "bg-background border-border"
                  )}>
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm sm:text-base">{app.name}</h3>
                      {app.popular && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Popular
                        </span>
                      )}
                      {app.connected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Connected
                        </span>
                      )}
                      {!app.provider && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {app.description}
                    </p>
                    {app.connectedEmail && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 truncate">
                        {app.connectedEmail}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* App Detail Dialog */}
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-md">
            {selectedApp && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      {selectedApp.icon}
                    </div>
                    <div>
                      <DialogTitle>{selectedApp.name}</DialogTitle>
                      {selectedApp.connected && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </span>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                
                <DialogDescription className="text-foreground">
                  {selectedApp.description}
                </DialogDescription>

                {selectedApp.connectedEmail && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Connected as: </span>
                      <span className="font-medium">{selectedApp.connectedEmail}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Features</h4>
                  <ul className="space-y-2">
                    {selectedApp.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {!selectedApp.connected && selectedApp.provider && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Connecting will require you to authorize access to your {selectedApp.name} account through a secure OAuth flow.
                    </p>
                  </div>
                )}

                {!selectedApp.provider && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      This integration is coming soon. We're working on adding support for {selectedApp.name}.
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  {selectedApp.connected ? (
                    <>
                      <Button variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleDisconnect(selectedApp)}
                        disabled={disconnectIntegration.isPending}
                      >
                        {disconnectIntegration.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleConnect(selectedApp)}
                      disabled={isConnecting || !selectedApp.provider}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : !selectedApp.provider ? (
                        'Coming Soon'
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Connect {selectedApp.name}
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-card rounded-xl border border-border">
          <h3 className="font-semibold mb-2">Need a different integration?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We're always adding new integrations. Let us know what you'd like to see!
          </p>
          <Button variant="outline" size="sm">
            Request Integration
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
