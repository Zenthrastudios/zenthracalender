import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Link,
    FileText,
    File,
    StickyNote,
    Download,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Cast supabase for new tables
const db = supabase as any;

interface LessonResource {
    id: string;
    lesson_id: string;
    title: string;
    description: string | null;
    resource_type: 'link' | 'pdf' | 'doc' | 'file' | 'note';
    resource_url: string | null;
    content: string | null;
    order_index: number;
}

interface ViewerResourcesProps {
    lessonId: string;
    lessonTitle: string;
    variant?: 'sheet' | 'inline';
}

const resourceTypeConfig = {
    // ... existing config (we can leave this as is in the file, just updating the component below)
    link: {
        icon: Link,
        label: 'Link',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
    },
    pdf: {
        icon: FileText,
        label: 'PDF',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
    },
    doc: {
        icon: File,
        label: 'Doc',
        color: 'text-blue-500',
        bgColor: 'bg-blue-600/20',
    },
    file: {
        icon: File,
        label: 'File',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
    },
    note: {
        icon: StickyNote,
        label: 'Note',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
    },
};

const ensureProtocol = (url: string) => {
    if (!url) return url;
    // If it's already an absolute URL or a protocol-relative one, return it
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
        return url;
    }
    // Default to https for everything else (like google.com)
    return `https://${url}`;
};

export default function ViewerResources({ lessonId, lessonTitle, variant = 'sheet' }: ViewerResourcesProps) {
    const [resources, setResources] = useState<LessonResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    useEffect(() => {
        async function loadResources() {
            if (!lessonId) {
                setResources([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await db
                    .from('lesson_resources')
                    .select('*')
                    .eq('lesson_id', lessonId)
                    .order('order_index', { ascending: true });

                if (error) throw error;
                setResources(data || []);
            } catch (err) {
                console.error('Failed to load resources:', err);
                setResources([]);
            } finally {
                setLoading(false);
            }
        }

        loadResources();
    }, [lessonId]);

    if (loading) {
        return null;
    }

    if (resources.length === 0) {
        return null;
    }

    const getResourceIcon = (type: LessonResource['resource_type']) => {
        const config = resourceTypeConfig[type];
        const IconComponent = config.icon;
        return <IconComponent className={cn('w-4 h-4', config.color)} />;
    };

    const ResourcesList = () => (
        <div className="space-y-3">
            {resources.map((resource) => {
                const config = resourceTypeConfig[resource.resource_type];
                const isNote = resource.resource_type === 'note';
                const isExpanded = expandedNote === resource.id;

                return (
                    <div
                        key={resource.id}
                        className={cn(
                            'rounded-lg border border-zinc-700 overflow-hidden transition-colors',
                            isNote && isExpanded ? 'bg-zinc-800' : 'bg-zinc-800/50 hover:bg-zinc-800'
                        )}
                    >
                        <div
                            className={cn(
                                'flex items-center gap-3 p-3',
                                isNote && 'cursor-pointer'
                            )}
                            onClick={() => isNote && setExpandedNote(isExpanded ? null : resource.id)}
                        >
                            <div className={cn('p-2 rounded-md', config.bgColor)}>
                                {getResourceIcon(resource.resource_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{resource.title}</p>
                                {resource.description && (
                                    <p className="text-xs text-zinc-400 truncate">
                                        {resource.description}
                                    </p>
                                )}
                            </div>
                            {isNote ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </Button>
                            ) : (resource.resource_url || (resource.title && resource.title.startsWith('http'))) ? (
                                <a
                                    href={ensureProtocol(
                                        (resource.title && resource.title.startsWith('http'))
                                            ? resource.title
                                            : (resource.resource_url || '')
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-primary hover:text-primary"
                                    >
                                        {resource.resource_type === 'link' ? (
                                            <>
                                                Open <ExternalLink className="w-3 h-3 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                Download <Download className="w-3 h-3 ml-1" />
                                            </>
                                        )}
                                    </Button>
                                </a>
                            ) : null}
                        </div>

                        {/* Expanded note content */}
                        {isNote && isExpanded && resource.content && (
                            <div className="px-3 pb-3 pt-1 border-t border-zinc-700">
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                                        {resource.content}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (variant === 'inline') {
        return (
            <div className="mt-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Resources</h3>
                <ResourcesList />
            </div>
        );
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 sm:gap-2 text-zinc-400 hover:text-white px-2 sm:px-3"
                >
                    <FolderOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Resources</span>
                    <span className="text-[10px] sm:text-xs font-bold bg-zinc-800 text-zinc-300 w-5 h-5 flex items-center justify-center rounded-full">
                        {resources.length}
                    </span>
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-[400px]">
                <SheetHeader>
                    <SheetTitle className="text-white">Lesson Resources</SheetTitle>
                    <p className="text-sm text-zinc-400 truncate">{lessonTitle}</p>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                    <div className="pr-4">
                        <ResourcesList />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
