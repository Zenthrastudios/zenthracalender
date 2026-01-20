import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Video, Phone, MapPin, ArrowRight, Calendar, IndianRupee, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTestimonials } from '@/hooks/useTestimonials';
import type { EventType } from '@/hooks/useEventTypes';

interface BrandingData {
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  is_enabled: boolean;
}

interface ProfileData {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  timezone: string;
}

function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      if (!username) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, username, avatar_url, timezone')
        .eq('username', username)
        .maybeSingle();

      if (profileError || !profile) return null;

      const { data: eventTypes, error: eventError } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data: branding, error: brandingError } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (eventError) return null;

      return {
        profile: profile as ProfileData,
        eventTypes: eventTypes as EventType[],
        branding: branding as BrandingData | null,
      };
    },
    enabled: !!username,
  });
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const { data, isLoading } = usePublicProfile(username);
  
  // Get all testimonials for this user's event types
  const eventTypeIds = data?.eventTypes?.map(e => e.id) || [];
  const { data: allTestimonials } = useTestimonials(eventTypeIds[0], { includeHidden: false });

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
      case 'google_meet':
        return 'Google Meet';
      case 'zoom':
        return 'Zoom';
      case 'phone':
        return 'Phone Call';
      case 'in_person':
        return 'In Person';
      default:
        return 'Video Call';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold mb-2 text-foreground">Profile not found</h1>
          <p className="text-muted-foreground mb-6 max-w-xs mx-auto text-sm">This user doesn't exist or hasn't set up their profile yet.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { profile, eventTypes, branding } = data;
  const accentColor = branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124";
  const brandName = branding?.is_enabled && branding.brand_name ? branding.brand_name : profile.name;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: accentColor }}
          >
            {branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={brandName || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-lg">{(brandName || profile.name)?.charAt(0)}</span>
            )}
          </div>
          <span className="font-semibold text-lg text-foreground">{brandName}</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-muted-foreground">Powered by CalSchedule</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Profile Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-border bg-muted"
              >
                <span className="text-2xl font-semibold text-muted-foreground">
                  {profile.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="px-3 py-1 rounded-md bg-muted/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {profile.timezone?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Event Types */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-sm font-medium text-muted-foreground">
              {eventTypes.length > 0 ? 'Available Sessions' : 'Availability'}
            </h2>
          </div>

          <div className="grid gap-5">
            {eventTypes.map((event) => (
              <Link
                key={event.id}
                to={`/book/${username}/${event.slug}`}
                className={cn(
                  "block group relative overflow-hidden bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                )}
              >
                {/* Banner Image */}
                {event.banner_image_url && event.banner_image_url.trim() !== '' && (
                  <div className="w-full h-32 bg-muted overflow-hidden">
                    <img
                      src={event.banner_image_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color || accentColor }}
                        />
                        <h3 className="text-lg font-semibold text-foreground">
                          {event.title}
                        </h3>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs text-foreground font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{event.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs text-foreground font-medium">
                      {getLocationIcon(event.location_type)}
                      <span>{getLocationLabel(event.location_type)}</span>
                    </div>
                    {event.is_paid && event.price && event.price > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-xs font-semibold" style={{ color: accentColor }}>
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>₹{event.price.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {eventTypes.length === 0 && (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
              <div className="w-14 h-14 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No public sessions available yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later</p>
            </div>
          )}
        </div>

        {/* Testimonials Section */}
        {allTestimonials && allTestimonials.length > 0 && (
          <div className="mt-12 space-y-6">
            <div className="text-center">
              <h2 className="text-sm font-medium text-muted-foreground">What People Say</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {allTestimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{testimonial.author_name}</p>
                      {testimonial.author_title && (
                        <p className="text-xs text-muted-foreground mt-0.5">{testimonial.author_title}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3.5 h-3.5',
                            i < (testimonial.rating || 5) ? 'text-primary fill-primary' : 'text-muted'
                          )}
                          style={{
                            color: i < (testimonial.rating || 5) && accentColor ? accentColor : undefined,
                            fill: i < (testimonial.rating || 5) && accentColor ? accentColor : undefined
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
