import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLinkPage, useTrackLinkEvent, LinkItem } from '@/hooks/useLinkPages';
import { Loader2, Globe, Instagram, Twitter, Linkedin, Github, Youtube, Mail, Facebook } from 'lucide-react';
import SEO from '@/components/common/SEO';

const SocialIcon = ({ url }: { url: string }) => {
    const lower = url.toLowerCase();
    if (lower.includes('instagram')) return <Instagram className="w-5 h-5" />;
    if (lower.includes('twitter') || lower.includes('x.com')) return <Twitter className="w-5 h-5" />;
    if (lower.includes('linkedin')) return <Linkedin className="w-5 h-5" />;
    if (lower.includes('github')) return <Github className="w-5 h-5" />;
    if (lower.includes('youtube')) return <Youtube className="w-5 h-5" />;
    if (lower.includes('facebook')) return <Facebook className="w-5 h-5" />;
    if (lower.includes('mailto:')) return <Mail className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
};

export default function LinkTreePublic() {
    const { slug } = useParams();
    const { data: page, isLoading, error } = useLinkPage(slug!);
    const trackEvent = useTrackLinkEvent();

    useEffect(() => {
        if (page) {
            trackEvent.mutate({ pageId: page.id, type: 'view' });
        }
    }, [page?.id]);

    const handleLinkClick = (link: LinkItem) => {
        if (!page) return;
        trackEvent.mutate({ pageId: page.id, type: 'click', linkId: link.id, metadata: { url: link.url } });
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin w-8 h-8 text-gray-400" /></div>;
    }

    if (error || !page) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
                <h1 className="text-2xl font-bold">Page Not Found</h1>
                <p className="text-gray-500">The link you are looking for might have been removed or doesn't exist.</p>
            </div>
        );
    }

    const { theme, links } = page;

    // Theme Styles
    const bgStyle = theme.backgroundType === 'image' ? {
        backgroundImage: `url(${theme.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    } : theme.backgroundType === 'gradient' ? {
        background: theme.backgroundGradient
    } : {
        backgroundColor: theme.backgroundColor
    };

    const btnStyle = {
        backgroundColor: theme.buttonColor,
        color: theme.buttonTextColor,
        borderRadius: theme.buttonStyle === 'rounded' ? '9999px' : theme.buttonStyle === 'square' ? '8px' : '4px',
        border: theme.buttonStyle === 'outline' ? `2px solid ${theme.buttonColor}` : 'none',
        boxShadow: theme.buttonStyle === 'shadow' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
    };

    // Override for outline 
    const finalBtnStyle = theme.buttonStyle === 'outline' ? {
        ...btnStyle,
        backgroundColor: 'transparent',
        color: theme.buttonColor
    } : btnStyle;

    return (
        <div className="min-h-screen w-full transition-colors duration-500" style={{ ...bgStyle, fontFamily: theme.font }}>
            <div className="max-w-xl mx-auto min-h-screen px-4 py-16 flex flex-col items-center gap-8 animate-in fade-in duration-700">
                <SEO
                    title={page.title || 'My Links'}
                    description={page.bio || `Check out ${page.title}'s links!`}
                    image={page.avatar_url || undefined}
                    url={window.location.href}
                    type="profile"
                />

                {/* Profile */}
                <div className="flex flex-col items-center text-center gap-4 w-full">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-gray-200">
                        {page.avatar_url ? (
                            <img src={page.avatar_url} alt={page.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                <span className="text-2xl font-bold">{page.title.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                    <div style={{ color: theme.textColor }}>
                        <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
                        <p className="mt-2 text-base font-medium opacity-90 whitespace-pre-wrap leading-relaxed">{page.bio}</p>
                    </div>
                </div>

                {/* Links */}
                <div className="w-full space-y-4">
                    {links.filter(l => l.isActive).map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleLinkClick(link)}
                            className="block w-full py-4 px-6 text-center font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
                            style={finalBtnStyle}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {link.icon && <SocialIcon url={link.url} />} {/* Placeholder logic for icon if strictly needed */}
                                {link.title}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-10 pb-4">
                    <a href="/" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors" style={{ color: theme.textColor }}>
                        <span className="text-xs font-semibold">Intimatecare.in Link</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
