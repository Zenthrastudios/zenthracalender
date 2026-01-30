import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Video, Phone, MapPin, ArrowRight, Calendar, IndianRupee, Star, ShoppingBag, BookOpen, ExternalLink, Globe, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTestimonials } from '@/hooks/useTestimonials';
import type { EventType } from '@/hooks/useEventTypes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

interface DigitalProduct {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  file_type: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface PublicCourse {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
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

      const { data: products } = await supabase
        .from('digital_products')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (eventError) return null;

      return {
        profile: profile as ProfileData,
        eventTypes: eventTypes as EventType[],
        branding: branding as BrandingData | null,
        products: (products || []) as DigitalProduct[],
        courses: (courses || []) as PublicCourse[],
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
        return <Video className="w-3.5 h-3.5" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5" />;
      case 'in_person':
        return <MapPin className="w-3.5 h-3.5" />;
      default:
        return <Video className="w-3.5 h-3.5" />;
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
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
            <span className="text-xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold mb-2 text-foreground">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6 text-sm">The user you are looking for doesn't exist or hasn't set up their profile yet.</p>
          <Button asChild variant="outline">
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { profile, eventTypes, branding, products, courses } = data;
  const accentColor = branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124";
  const brandName = branding?.is_enabled && branding.brand_name ? branding.brand_name : profile.name;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm overflow-hidden"
              style={{ background: accentColor }}
            >
              {branding?.brand_logo_url ? (
                <img src={branding.brand_logo_url} alt={brandName || ""} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{(brandName || profile.name)?.charAt(0)}</span>
              )}
            </div>
            <span className="font-semibold text-base tracking-tight">{brandName}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-xs font-medium text-muted-foreground hover:text-foreground">
              <Link to="https://calschedule.com" target="_blank">Powered by CalSchedule</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Profile Hero */}
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative inline-block group">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-xl mx-auto ring-2 ring-border/50 transition-transform duration-500 group-hover:scale-105">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.name} className="object-cover" />
              <AvatarFallback className="text-3xl sm:text-4xl bg-muted font-medium text-muted-foreground">
                {profile.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-2 border-background rounded-full" title="Available" />
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{profile.name}</h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">@{profile.username}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Badge variant="secondary" className="px-3 py-1 bg-muted/50 hover:bg-muted/80 transition-colors font-medium text-muted-foreground rounded-full flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {profile.timezone?.replace('_', ' ')}
              </Badge>
              {/* Placeholder for social links if available in future */}
              {/* <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><Instagram className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><Twitter className="w-4 h-4" /></Button>
              </div> */}
            </div>
          </div>
        </div>

        {/* Available Sessions */}
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Available Sessions
            </h2>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{eventTypes.length} Available</span>
          </div>

          {eventTypes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
              {eventTypes.map((event) => (
                <Link
                  key={event.id}
                  to={`/book/${username}/${event.slug}`}
                  className="group block h-full"
                >
                  <Card className="h-full border-border/60 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                    {event.banner_image_url && event.banner_image_url.trim() !== '' && (
                      <div className="w-full h-36 bg-muted overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
                        <img
                          src={event.banner_image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader className="p-5 pb-3 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-background"
                            style={{ backgroundColor: event.color || accentColor }}
                          />
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {event.title}
                          </h3>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardFooter className="p-5 pt-0 mt-auto">
                      <div className="flex flex-wrap items-center gap-2 w-full">
                        <Badge variant="outline" className="bg-background/50 border-border/60 text-muted-foreground font-medium flex gap-1.5 items-center">
                          <Clock className="w-3 h-3" />
                          {event.duration}m
                        </Badge>
                        <Badge variant="outline" className="bg-background/50 border-border/60 text-muted-foreground font-medium flex gap-1.5 items-center">
                          {getLocationIcon(event.location_type)}
                          {getLocationLabel(event.location_type)}
                        </Badge>
                        {event.is_paid && event.price && event.price > 0 && (
                          <Badge className="ml-auto bg-primary/10 text-primary hover:bg-primary/20 border-0 font-semibold flex gap-1 items-center px-2.5">
                            <IndianRupee className="w-3 h-3" />
                            {event.price.toLocaleString('en-IN')}
                          </Badge>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border/60">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No sessions available at the moment.</p>
            </div>
          )}
        </section>

        {/* Digital Products Section */}
        {products && products.length > 0 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Digital Products
              </h2>
              <Link to="#" className="text-xs font-medium text-primary hover:underline hidden sm:block">View All</Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="group block h-full"
                >
                  <Card className="h-full border-border/60 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="flex flex-col sm:flex-row h-full">
                      {product.thumbnail_url && (
                        <div className="w-full sm:w-40 h-48 sm:h-auto bg-muted overflow-hidden relative flex-shrink-0">
                          <img
                            src={product.thumbnail_url}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs font-semibold shadow-sm">
                              {product.file_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 flex flex-col p-5">
                        <div className="flex-1 space-y-2 mb-4">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {product.title}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                          <div className="flex items-center font-bold text-primary text-lg">
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {product.price.toLocaleString('en-IN')}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Courses Section */}
        {courses && courses.length > 0 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Courses
              </h2>
              <Link to="#" className="text-xs font-medium text-primary hover:underline hidden sm:block">View All</Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.slug}`}
                  className="group block h-full"
                >
                  <Card className="h-full border-border/60 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                    {course.thumbnail_url && (
                      <div className="w-full bg-muted overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 flex items-end p-4">
                          <Badge className="bg-background/90 backdrop-blur-sm text-foreground hover:bg-background border-0 shadow-lg">
                            Course
                          </Badge>
                        </div>
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-auto object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader className="p-5 pb-3 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardFooter className="p-5 pt-0 mt-auto border-t border-border/40">
                      <div className="flex items-center justify-between w-full pt-4">
                        {course.price && course.price > 0 ? (
                          <div className="flex items-center font-bold text-foreground text-lg">
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {course.price.toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <span className="font-bold text-green-600 text-lg">Free</span>
                        )}
                        <Button variant="ghost" size="sm" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground">
                          Enroll Now <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        {allTestimonials && allTestimonials.length > 0 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
            <div className="text-center pb-4">
              <h2 className="text-xl font-semibold tracking-tight">Kind Words</h2>
              <p className="text-sm text-muted-foreground mt-1">What people are saying</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
              {allTestimonials.map((testimonial) => (
                <Card key={testimonial.id} className="border-border/60 bg-card/30 hover:bg-card hover:border-border transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-4 h-4',
                            i < (testimonial.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-muted'
                          )}
                        />
                      ))}
                    </div>
                    <blockquote className="text-base text-foreground/90 italic leading-relaxed">
                      "{testimonial.content}"
                    </blockquote>
                    <div className="flex items-center gap-3 pt-2">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {testimonial.author_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{testimonial.author_name}</p>
                        {testimonial.author_title && (
                          <p className="text-xs text-muted-foreground">{testimonial.author_title}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="container max-w-4xl mx-auto px-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
