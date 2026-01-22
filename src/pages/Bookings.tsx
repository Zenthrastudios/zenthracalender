import { useState, useEffect } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useBookings, useCancelBooking, Booking } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  MoreHorizontal,
  XCircle,
  RefreshCw,
  Mail,
  ExternalLink,
  Copy,
  FileText,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FilterType = 'upcoming' | 'past' | 'cancelled' | 'rescheduled';

export default function Bookings() {
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const { data: bookings, isLoading } = useBookings(filter);
  const cancelBooking = useCancelBooking();

  // Handle deep linking to specific booking
  useEffect(() => {
    const bookingId = searchParams.get('id');
    if (bookingId && bookings) {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
        setDetailDialogOpen(true);
      }
    }
  }, [searchParams, bookings]);

  const filteredBookings = bookings?.filter(booking =>
    booking.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.attendee_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.event_type?.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      await cancelBooking.mutateAsync(selectedBooking);
      toast.success('Booking cancelled successfully');
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailDialogOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getLocationLabel = (type: string) => {
    switch (type) {
      case 'google_meet': return 'Google Meet';
      case 'zoom': return 'Zoom';
      case 'phone': return 'Phone Call';
      case 'in_person': return 'In Person';
      default: return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Bookings</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-card border-border"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past', 'rescheduled', 'cancelled'] as FilterType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                filter === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading bookings...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No {filter} bookings</h2>
            <p className="text-muted-foreground">
              {filter === 'upcoming'
                ? "You don't have any upcoming bookings yet."
                : filter === 'past'
                  ? "No past bookings found."
                  : filter === 'rescheduled'
                    ? "No rescheduled bookings found."
                    : "No cancelled bookings."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const startDate = new Date(booking.start_time);
              const endDate = new Date(booking.end_time);
              const isBookingToday = isToday(startDate);
              const isBookingPast = isPast(startDate);

              return (
                <div
                  key={booking.id}
                  className={cn(
                    "bg-card rounded-xl border border-border p-5 transition-all hover:shadow-card-hover cursor-pointer",
                    booking.status === 'cancelled' && "opacity-60"
                  )}
                  onClick={() => handleViewDetails(booking)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Date/Time Column */}
                      <div className="text-center min-w-[80px]">
                        <div className={cn(
                          "text-xs font-medium uppercase mb-1",
                          isBookingToday ? "text-primary" : "text-muted-foreground"
                        )}>
                          {isBookingToday ? 'Today' : format(startDate, 'EEE')}
                        </div>
                        <div className="text-2xl font-bold">{format(startDate, 'd')}</div>
                        <div className="text-xs text-muted-foreground">{format(startDate, 'MMM')}</div>
                      </div>

                      {/* Booking Details */}
                      <div>
                        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                          {booking.event_type?.title || 'Meeting'}
                          {booking.is_rescheduled && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] h-5">
                              Rescheduled
                            </Badge>
                          )}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {getLocationIcon(booking.event_type?.location_type || 'google_meet')}
                            <span>{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                              <User className="w-4 h-4 text-accent-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{booking.attendee_name}</p>
                              <p className="text-xs text-muted-foreground">{booking.attendee_email}</p>
                            </div>
                          </div>
                        </div>

                        {booking.notes && (
                          <p className="text-sm text-muted-foreground mt-3 italic">
                            "{booking.notes}"
                          </p>
                        )}

                        {booking.status === 'cancelled' && (
                          <span className="inline-block mt-2 px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-md font-medium">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {booking.status !== 'cancelled' && !isBookingPast && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            window.open(`mailto:${booking.attendee_email}`);
                          }}>
                            <Mail className="w-4 h-4 mr-2" />
                            Email attendee
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Booking Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            {selectedBooking && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-xl">
                      {selectedBooking.event_type?.title || 'Meeting Details'}
                    </DialogTitle>
                    {selectedBooking.status === 'cancelled' ? (
                      <Badge variant="destructive">Cancelled</Badge>
                    ) : (
                      <Badge className="bg-emerald-500 text-white">Confirmed</Badge>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Date & Time */}
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(selectedBooking.start_time), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedBooking.start_time), 'h:mm a')} - {format(new Date(selectedBooking.end_time), 'h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedBooking.attendee_timezone}
                      </p>
                    </div>
                  </div>

                  {/* Attendee Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Attendee</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <User className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedBooking.attendee_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedBooking.attendee_email}</p>
                        {selectedBooking.attendee_phone && (
                          <p className="text-sm text-muted-foreground">{selectedBooking.attendee_phone}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(selectedBooking.attendee_email, 'Email')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Location</h4>
                    <div className="flex items-center gap-3">
                      {getLocationIcon(selectedBooking.event_type?.location_type || 'google_meet')}
                      <span>{getLocationLabel(selectedBooking.event_type?.location_type || 'google_meet')}</span>
                    </div>
                    {selectedBooking.meet_link && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Input
                          value={selectedBooking.meet_link}
                          readOnly
                          className="bg-muted text-sm flex-1 min-w-0"
                        />
                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(selectedBooking.meet_link!, 'Meeting link')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="shrink-0" asChild>
                          <a
                            href={selectedBooking.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open meeting link"
                            title="Open meeting link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Legacy notes with custom responses (for old bookings) */}
                  {selectedBooking.notes && selectedBooking.notes.includes('--- Custom Responses ---') && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notes</h4>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{selectedBooking.notes.split('--- Custom Responses ---')[0].trim() || 'No additional notes'}</p>
                      </div>
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-4">Form Responses</h4>
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        {selectedBooking.notes.split('--- Custom Responses ---')[1]?.trim().split('\n').map((line, idx) => {
                          const [label, ...valueParts] = line.split(':');
                          const value = valueParts.join(':').trim();
                          return (
                            <div key={idx} className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{label?.trim()}</span>
                              <span className="text-sm font-medium">{value || '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Responses (new format) */}
                  {selectedBooking.custom_responses && Array.isArray(selectedBooking.custom_responses) && selectedBooking.custom_responses.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Form Responses</h4>
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                        {selectedBooking.custom_responses.map((response, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-xs text-muted-foreground">{response.label}</span>
                            <span className="text-sm font-medium">
                              {response.type === 'checkbox' ? (response.value ? 'Yes' : 'No') : String(response.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reschedule Link */}
                  {selectedBooking.reschedule_token && selectedBooking.status !== 'cancelled' && !isPast(new Date(selectedBooking.start_time)) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Reschedule Link</h4>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Input
                            value={`${window.location.origin}/reschedule/${selectedBooking.reschedule_token}`}
                            readOnly
                            className="bg-muted text-sm pr-10 truncate"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none bg-gradient-to-l from-muted pl-4">
                            {/* Gradient fade effect (optional) */}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => copyToClipboard(
                            `${window.location.origin}/reschedule/${selectedBooking.reschedule_token}`,
                            'Reschedule link'
                          )}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this link with the attendee to allow them to reschedule</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-freedom gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`mailto:${selectedBooking.attendee_email}`)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email Attendee
                    </Button>
                    {selectedBooking.status !== 'cancelled' && !isPast(new Date(selectedBooking.start_time)) && (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 whitespace-nowrap"
                          onClick={() => copyToClipboard(
                            `${window.location.origin}/reschedule/${selectedBooking.reschedule_token}`,
                            'Reschedule link'
                          )}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Send Reschedule
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setDetailDialogOpen(false);
                            setCancelDialogOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the booking with {selectedBooking?.attendee_name} and send them a cancellation email.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}