import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Video, Phone, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventType } from '@/hooks/useEventTypes';

interface ProfileData {
  user_id: string;
  name: string;
  username: string;
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

      if (eventError) return null;

      return {
        profile: profile as ProfileData,
        eventTypes: eventTypes as EventType[],
      };
    },
    enabled: !!username,
  });
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const { data, isLoading } = usePublicProfile(username);

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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground mb-4">This user doesn't exist or hasn't set up their profile.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { profile, eventTypes } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">C</span>
          </div>
          <span className="font-semibold">CalSchedule</span>
        </Link>
        <span className="text-sm text-muted-foreground">Powered by CalSchedule</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="text-center mb-10">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-4 ring-accent"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-accent">
              <span className="text-3xl font-bold text-primary">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Calendar className="w-4 h-4" />
            {profile.timezone?.replace('_', ' ')}
          </p>
        </div>

        {/* Event Types List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-center mb-6">
            {eventTypes.length > 0 ? 'Schedule a meeting' : 'No events available'}
          </h2>

          {eventTypes.map((event) => (
            <Link
              key={event.id}
              to={`/book/${username}/${event.slug}`}
              className={cn(
                "block bg-card rounded-xl border border-border p-5 hover:shadow-card-hover hover:border-primary/50 transition-all duration-200 group"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {event.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                    )}
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{event.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getLocationIcon(event.location_type)}
                      <span>{getLocationLabel(event.location_type)}</span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {eventTypes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>This user hasn't created any public events yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
