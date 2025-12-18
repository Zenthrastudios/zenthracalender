import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useBookings, useCancelBooking, Booking } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Mail
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FilterType = 'upcoming' | 'past' | 'cancelled';

export default function Bookings() {
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings, isLoading } = useBookings(filter);
  const cancelBooking = useCancelBooking();

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
          {(['upcoming', 'past', 'cancelled'] as FilterType[]).map((tab) => (
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
                    "bg-card rounded-xl border border-border p-5 transition-all hover:shadow-card-hover",
                    booking.status === 'cancelled' && "opacity-60"
                  )}
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
                        <h3 className="font-semibold text-lg mb-1">
                          {booking.event_type?.title || 'Meeting'}
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
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`mailto:${booking.attendee_email}`)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Email attendee
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
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
