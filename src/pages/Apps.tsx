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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Loader2,
  Phone,
  MessageSquare,
  Lock,
  Globe,
  Plus,
  Copy,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWhatsappSettings, useUpdateWhatsappSettings } from '@/hooks/useWhatsapp';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/usePaymentSettings';
import { CreditCard, Wallet, IndianRupee } from 'lucide-react';

interface WhatsAppConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

function WhatsAppConfigDialog({ isOpen, onClose }: WhatsAppConfigProps) {
  const { data: settings, isLoading } = useWhatsappSettings();
  const updateSettings = useUpdateWhatsappSettings();

  const [formData, setFormData] = useState({
    api_key: '',
    phone_number_id: '',
    business_account_id: '',
    customer_template_name: 'booking_confirmation',
    instructor_template_name: 'new_booking_instructor',
    cancelled_template_name: 'booking_cancelled',
    rescheduled_template_name: 'booking_rescheduled',
    payment_failed_template_name: 'payment_failed',
    template_language: 'en',
    is_enabled: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        api_key: settings.api_key || '',
        phone_number_id: settings.phone_number_id || '',
        business_account_id: settings.business_account_id || '',
        customer_template_name: settings.customer_template_name || 'booking_confirmation',
        instructor_template_name: settings.instructor_template_name || 'new_booking_instructor',
        cancelled_template_name: settings.cancelled_template_name || 'booking_cancelled',
        rescheduled_template_name: settings.rescheduled_template_name || 'booking_rescheduled',
        payment_failed_template_name: settings.payment_failed_template_name || 'payment_failed',
        template_language: settings.template_language || 'en',
        is_enabled: settings.is_enabled ?? true
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('WhatsApp settings updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    }
  };

  const [activeTab, setActiveTab] = useState('config');

  const TEMPLATE_GUIDES = [
    {
      id: 'customer',
      name: 'Booking Confirmation (Customer)',
      refName: 'booking_confirmation',
      content: 'Hello {{1}}! We are happy to confirm your booking for {{2}} scheduled for {{3}} with {{4}}. You can view your booking details and access the meeting link here: {{5}}. Thank you for your booking!',
      params: ['Customer Name', 'Event Title', 'Date/Time', 'Host Name', 'Confirmation Link']
    },
    {
      id: 'instructor',
      name: 'New Booking Alert (Instructor)',
      refName: 'new_booking_instructor',
      content: 'New Booking Alert! Hello {{1}}, a new session for {{2}} has been scheduled by a client for {{3}} with {{4}}. Please check your dashboard for further details and to prepare for the session here: {{5}}. Have a great day!',
      params: ['Instructor/Host Name', 'Event Title', 'Date/Time', 'Customer Name', 'Dashboard Link']
    },
    {
      id: 'cancellation',
      name: 'Booking Cancelled',
      refName: 'booking_cancelled',
      content: 'Booking Cancellation: Hello {{1}}, we are writing to inform you that your upcoming booking for {{2}} on {{3}} has been cancelled by {{4}}. If you believe this is an error or need further assistance, please contact our support team. We apologize for any inconvenience caused.',
      params: ['Attendee Name', 'Event Title', 'Date/Time', 'Canceller Name']
    },
    {
      id: 'reschedule',
      name: 'Booking Rescheduled',
      refName: 'booking_rescheduled',
      content: 'Booking Rescheduled: Hello {{1}}, your booking for {{2}} has been successfully rescheduled to a new time: {{3}}. You can view the updated confirmation and details using this link: {{4}}. We look forward to seeing you then!',
      params: ['Attendee Name', 'Event Title', 'New Date/Time', 'Confirmation Link']
    },
    {
      id: 'payment_failed',
      name: 'Payment Failed',
      refName: 'payment_failed',
      content: 'Important: Payment Failed. Hello {{1}}, we were unable to process the payment for your booking for {{2}} on {{3}}. To secure your spot, please retry the payment using this link: {{4}}. If the issue persists, please contact your bank or reach out to us for support.',
      params: ['Attendee Name', 'Event Title', 'Date/Time', 'Retry Link']
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>WhatsApp Business API</DialogTitle>
              <DialogDescription>
                Configure credentials and message templates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="templates">Templates Content</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  API Credentials
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_key">System User Access Token</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="EAAB..."
                      value={formData.api_key}
                      onChange={e => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone_id">Phone Number ID</Label>
                      <Input
                        id="phone_id"
                        placeholder="1029384..."
                        value={formData.phone_number_id}
                        onChange={e => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_id">Business Account ID</Label>
                      <Input
                        id="account_id"
                        placeholder="0918273..."
                        value={formData.business_account_id}
                        onChange={e => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Message Templates
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_template">Customer Confirmation Template</Label>
                    <Input
                      id="customer_template"
                      placeholder="booking_confirmation"
                      value={formData.customer_template_name}
                      onChange={e => setFormData(prev => ({ ...prev, customer_template_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructor_template">Instructor Alert Template</Label>
                    <Input
                      id="instructor_template"
                      placeholder="new_booking_instructor"
                      value={formData.instructor_template_name}
                      onChange={e => setFormData(prev => ({ ...prev, instructor_template_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancelled_template">Booking Cancelled Template</Label>
                    <Input
                      id="cancelled_template"
                      placeholder="booking_cancelled"
                      value={formData.cancelled_template_name}
                      onChange={e => setFormData(prev => ({ ...prev, cancelled_template_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rescheduled_template">Booking Rescheduled Template</Label>
                    <Input
                      id="rescheduled_template"
                      placeholder="booking_rescheduled"
                      value={formData.rescheduled_template_name}
                      onChange={e => setFormData(prev => ({ ...prev, rescheduled_template_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_failed_template">Payment Failed Template</Label>
                    <Input
                      id="payment_failed_template"
                      placeholder="payment_failed"
                      value={formData.payment_failed_template_name}
                      onChange={e => setFormData(prev => ({ ...prev, payment_failed_template_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template_language">Template Language Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="template_language"
                        placeholder="en, en_US, etc."
                        value={formData.template_language}
                        onChange={e => setFormData(prev => ({ ...prev, template_language: e.target.value }))}
                        className="flex-1"
                      />
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border flex-1">
                        Use <strong>en</strong> for English, <strong>en_US</strong> for US English, etc. Match this exactly with your Meta dashboard.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Enable WhatsApp Notifications</Label>
                  <p className="text-xs text-muted-foreground">Automatically send messages when bookings are made</p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="templates" className="py-4 space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-lg flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-400">Important Meta Requirement</p>
                <p className="text-amber-800/80 dark:text-amber-500/80">
                  You must create these templates in your Meta Business Suite dashboard exactly as shown below for them to work correctly.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {TEMPLATE_GUIDES.map((guide) => (
                <div key={guide.id} className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{guide.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Meta Template Name: <span className="text-primary font-bold">{guide.refName}</span></span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2"
                      onClick={() => copyToClipboard(guide.content)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </Button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="bg-muted p-3 rounded-lg font-mono text-sm break-words border border-border">
                      {guide.content}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Parameters Mapping:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {guide.params.map((param, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-4 h-4 flex items-center justify-center bg-primary/10 text-primary rounded-full shrink-0 font-bold">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{param}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RazorpayConfigDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: settings } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();

  const [formData, setFormData] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    is_razorpay_enabled: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        razorpay_key_id: settings.razorpay_key_id || '',
        razorpay_key_secret: settings.razorpay_key_secret || '',
        is_razorpay_enabled: settings.is_razorpay_enabled ?? true
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Razorpay settings updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>Razorpay Integration</DialogTitle>
              <DialogDescription>
                Configure your Razorpay API keys to accept payments
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rzp_key">Key ID</Label>
              <Input
                id="rzp_key"
                placeholder="rzp_live_..."
                value={formData.razorpay_key_id}
                onChange={e => setFormData(prev => ({ ...prev, razorpay_key_id: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rzp_secret">Key Secret</Label>
              <Input
                id="rzp_secret"
                type="password"
                placeholder="••••••••••••"
                value={formData.razorpay_key_secret}
                onChange={e => setFormData(prev => ({ ...prev, razorpay_key_secret: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base">Enable Razorpay</Label>
              <p className="text-xs text-muted-foreground">Accept payments via Razorpay on your booking pages</p>
            </div>
            <Switch
              checked={formData.is_razorpay_enabled}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, is_razorpay_enabled: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CashfreeConfigDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: settings } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();

  const [formData, setFormData] = useState({
    cashfree_app_id: '',
    cashfree_secret_key: '',
    is_cashfree_enabled: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        cashfree_app_id: settings.cashfree_app_id || '',
        cashfree_secret_key: settings.cashfree_secret_key || '',
        is_cashfree_enabled: settings.is_cashfree_enabled ?? true
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Cashfree settings updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>Cashfree Integration</DialogTitle>
              <DialogDescription>
                Configure your Cashfree App ID and Secret Key
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cf_id">App ID</Label>
              <Input
                id="cf_id"
                placeholder="Enter App ID"
                value={formData.cashfree_app_id}
                onChange={e => setFormData(prev => ({ ...prev, cashfree_app_id: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf_secret">Secret Key</Label>
              <Input
                id="cf_secret"
                type="password"
                placeholder="••••••••••••"
                value={formData.cashfree_secret_key}
                onChange={e => setFormData(prev => ({ ...prev, cashfree_secret_key: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base">Enable Cashfree</Label>
              <p className="text-xs text-muted-foreground">Accept payments via Cashfree on your booking pages</p>
            </div>
            <Switch
              checked={formData.is_cashfree_enabled}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, is_cashfree_enabled: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AppIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'calendar' | 'conferencing' | 'email' | 'automation' | 'payments';
  provider: string | null;
  connected: boolean;
  popular?: boolean;
  features: string[];
  connectedEmail?: string | null;
  requiresConfig?: boolean;
}

const WHATSAPP_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6 fill-[#25D366]"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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
    provider: 'google',
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
    provider: 'google',
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
    provider: null,
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
    provider: null,
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
    provider: null,
    features: [
      'Connect to 5000+ apps',
      'Trigger on new bookings',
      'Automate follow-ups',
      'Custom workflows',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send automated booking confirmations and reminders via WhatsApp to customers and instructors.',
    icon: WHATSAPP_ICON,
    category: 'automation',
    provider: 'whatsapp',
    popular: true,
    requiresConfig: true,
    features: [
      'Automated confirmation messages',
      'Reminders to both parties',
      'Custom message templates',
      'Higher open rates than email',
    ],
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Accept payments in INR with Razorpay. Supports UPI, Cards, and Netbanking.',
    icon: <IndianRupee className="w-6 h-6 text-blue-500" />,
    category: 'payments',
    provider: 'razorpay',
    popular: true,
    requiresConfig: true,
    features: [
      'Accept UPI payments',
      'Card & Netbanking support',
      'Automatic refund handling',
      'Payment analytics',
    ],
  },
  {
    id: 'cashfree',
    name: 'Cashfree Payments',
    description: 'Fastest way to collect payments in India. Supports 120+ payment modes.',
    icon: <CreditCard className="w-6 h-6 text-cyan-600" />,
    category: 'payments',
    provider: 'cashfree',
    requiresConfig: true,
    features: [
      '120+ payment modes',
      'Instant settlements',
      'Low transaction fees',
      'Mobile SDK support',
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Apps' },
  { id: 'calendar', label: 'Calendars' },
  { id: 'conferencing', label: 'Video Conferencing' },
  { id: 'email', label: 'Email' },
  { id: 'payments', label: 'Payments' },
  { id: 'automation', label: 'Automation' },
];

export default function Apps() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: integrations, isLoading } = useIntegrations();
  const { data: whatsappSettings } = useWhatsappSettings();
  const { data: paymentSettings } = usePaymentSettings();
  const connectGoogle = useConnectGoogle();
  const disconnectIntegration = useDisconnectIntegration();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedApp, setSelectedApp] = useState<AppIntegration | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'google') {
      toast.success('Google connected successfully!');
      window.history.replaceState({}, '', '/dashboard/apps');
    } else if (error) {
      toast.error('Failed to connect. Please try again.');
      window.history.replaceState({}, '', '/dashboard/apps');
    }
  }, [searchParams]);

  const apps: AppIntegration[] = BASE_INTEGRATIONS.map(app => {
    let connected = false;
    let connectedEmail = null;

    if (app.provider === 'google') {
      const gIntegration = integrations?.find(i => i.provider === 'google');
      connected = !!gIntegration;
      connectedEmail = gIntegration?.provider_email;
    } else if (app.id === 'whatsapp') {
      connected = !!whatsappSettings?.is_enabled && !!whatsappSettings?.api_key;
    } else if (app.id === 'razorpay') {
      connected = !!paymentSettings?.is_razorpay_enabled && !!paymentSettings?.razorpay_key_id;
    } else if (app.id === 'cashfree') {
      connected = !!paymentSettings?.is_cashfree_enabled && !!paymentSettings?.cashfree_app_id;
    } else {
      const integration = integrations?.find(i => i.provider === app.provider);
      connected = !!integration;
      connectedEmail = integration?.provider_email;
    }

    return {
      ...app,
      connected,
      connectedEmail,
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
        window.location.href = authUrl;
      } catch (error: any) {
        console.error('Connect error:', error);
        toast.error(error.message || 'Failed to start connection');
        setIsConnecting(false);
      }
    }
  };

  const updateWhatsapp = useUpdateWhatsappSettings();
  const updatePayment = useUpdatePaymentSettings();

  const handleDisconnect = async (app: AppIntegration) => {
    if (!app.provider) return;

    try {
      if (app.id === 'whatsapp') {
        await updateWhatsapp.mutateAsync({ is_enabled: false });
      } else if (app.id === 'razorpay') {
        await updatePayment.mutateAsync({ is_razorpay_enabled: false });
      } else if (app.id === 'cashfree') {
        await updatePayment.mutateAsync({ is_cashfree_enabled: false });
      } else {
        await disconnectIntegration.mutateAsync(app.provider);
      }
      setSelectedApp(null);
      toast.success(`${app.name} disconnected`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:p-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold">Apps & Integrations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Connect your favorite tools to enhance your scheduling</p>
        </div>

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

        <Dialog
          open={!!selectedApp && !['whatsapp', 'razorpay', 'cashfree'].includes(selectedApp.id)}
          onOpenChange={() => setSelectedApp(null)}
        >
          <DialogContent className="max-w-md">
            {selectedApp && !['whatsapp', 'razorpay', 'cashfree'].includes(selectedApp.id) && (
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

        <WhatsAppConfigDialog
          isOpen={!!selectedApp && selectedApp.id === 'whatsapp'}
          onClose={() => setSelectedApp(null)}
        />

        <RazorpayConfigDialog
          isOpen={!!selectedApp && selectedApp.id === 'razorpay'}
          onClose={() => setSelectedApp(null)}
        />

        <CashfreeConfigDialog
          isOpen={!!selectedApp && selectedApp.id === 'cashfree'}
          onClose={() => setSelectedApp(null)}
        />

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
