import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Video, Phone, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        branding: (branding as any) as BrandingData | null,
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
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">Profile not found</h1>
          <p className="text-gray-400 mb-8 max-w-xs mx-auto text-pretty">This user doesn't exist or hasn't set up their profile yet.</p>
          <Button asChild className="rounded-full px-8 py-6 h-auto text-lg bg-primary hover:bg-primary/90">
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
    <div className="min-h-screen bg-[#0B0B0F] selection:bg-primary/30">
      {/* Dynamic Header */}
      <header className="w-full px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#0B0B0F]/80">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: accentColor }}
          >
            {branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={brandName || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-xl">{(brandName || profile.name)?.charAt(0)}</span>
            )}
          </div>
          <span className="font-bold text-xl tracking-tight text-white">{brandName}</span>
        </Link>
        <div className="hidden sm:block">
          <span className="text-xs font-medium text-gray-500 tracking-widest uppercase">Powered by CalSchedule</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Profile Identity Card */}
        <div className="relative mb-16 text-center">
          <div className="absolute inset-0 -top-24 -z-10 bg-gradient-to-b from-primary/10 to-transparent blur-3xl opacity-50 h-96"></div>

          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse" style={{ background: accentColor }}></div>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-32 h-32 rounded-full object-cover relative z-10 p-1 bg-[#1C1C1E] border-2 border-white/10"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center relative z-10 border-2 border-white/10"
                style={{ background: `linear-gradient(135deg, ${accentColor}20, #1C1C1E)` }}
              >
                <span className="text-5xl font-bold" style={{ color: accentColor }}>
                  {profile.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{profile.name}</h1>
            <p className="text-lg text-gray-400 font-medium">@{profile.username}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                {profile.timezone?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">
              {eventTypes.length > 0 ? 'Select a session' : 'Availability'}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
          </div>

          <div className="grid gap-6">
            {eventTypes.map((event) => (
              <Link
                key={event.id}
                to={`/book/${username}/${event.slug}`}
                className={cn(
                  "block group relative overflow-hidden bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.05] hover:border-white/10 hover:shadow-2xl transition-all duration-300"
                )}
              >
                {/* Accent line on hover */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ background: accentColor }}
                ></div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#1C1C1E] group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner"
                      >
                        <div
                          className="w-4 h-4 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                          style={{ backgroundColor: event.color || accentColor }}
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-white group-hover:translate-x-1 transition-transform duration-300">
                        {event.title}
                      </h3>
                    </div>

                    {event.description && (
                      <p className="text-gray-400 mb-8 line-clamp-2 text-pretty leading-relaxed group-hover:text-gray-300 transition-colors">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-gray-300">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{event.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-gray-300">
                        {getLocationIcon(event.location_type)}
                        <span>{getLocationLabel(event.location_type)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex items-center h-full self-center">
                    <div
                      className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center transition-all duration-300 border border-white/5 group-hover:border-transparent group-hover:rotate-12 relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: accentColor }}
                      />
                      <ArrowRight className="w-7 h-7 text-white group-hover:-rotate-12 transition-transform duration-300 relative z-10" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {eventTypes.length === 0 && (
            <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10 shadow-inner">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-500 font-bold text-lg">This host hasn't scheduled any public sessions yet.</p>
              <p className="text-gray-600 text-sm mt-1">Check back later or contact the host directly.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
