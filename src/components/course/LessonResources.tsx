import { useState, useRef } from 'react';
import {
    useLessonResources,
    useCreateLessonResource,
    useDeleteLessonResource,
    LessonResource,
} from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Link,
    FileText,
    File,
    StickyNote,
    Plus,
    Trash2,
    Upload,
    Loader2,
    ExternalLink,
    Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getShortFilename } from '@/lib/fileUtils';

interface LessonResourcesProps {
    lessonId: string;
    courseId: string;
}

const resourceTypeConfig = {
    link: {
        icon: Link,
        label: 'External Link',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    pdf: {
        icon: FileText,
        label: 'PDF Document',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
    },
    doc: {
        icon: File,
        label: 'Document',
        color: 'text-blue-600',
        bgColor: 'bg-blue-600/10',
    },
    file: {
        icon: File,
        label: 'File',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
    },
    note: {
        icon: StickyNote,
        label: 'Note',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
    },
};

export default function LessonResources({ lessonId, courseId }: LessonResourcesProps) {
    const { user } = useAuth();
    const { data: resources = [], isLoading } = useLessonResources(lessonId);
    const createResource = useCreateLessonResource();
    const deleteResource = useDeleteLessonResource();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [resourceType, setResourceType] = useState<'link' | 'pdf' | 'doc' | 'file' | 'note'>('link');
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceDescription, setResourceDescription] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [resourceContent, setResourceContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setResourceType('link');
        setResourceTitle('');
        setResourceDescription('');
        setResourceUrl('');
        setResourceContent('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File must be less than 50MB');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const fileName = `${user.id}/${courseId}/${lessonId}/${Date.now()}_${file.name}`;

            const { error: uploadError } = await supabase.storage
                .from('lesson-resources')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('lesson-resources')
                .getPublicUrl(fileName);

            setResourceUrl(publicUrl);

            // Auto-set type based on extension
            if (fileExt === 'pdf') {
                setResourceType('pdf');
            } else if (['doc', 'docx'].includes(fileExt || '')) {
                setResourceType('doc');
            } else {
                setResourceType('file');
            }

            // Auto-set title if empty
            if (!resourceTitle) {
                setResourceTitle(file.name.replace(/\.[^/.]+$/, ''));
            }

            toast.success('File uploaded!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddResource = async () => {
        if (!resourceTitle.trim()) {
            toast.error('Please enter a title');
            return;
        }

        if (resourceType === 'note' && !resourceContent.trim()) {
            toast.error('Please enter note content');
            return;
        }

        if (resourceType !== 'note' && !resourceUrl.trim()) {
            toast.error('Please enter a URL or upload a file');
            return;
        }

        try {
            await createResource.mutateAsync({
                lessonId,
                title: resourceTitle,
                description: resourceDescription || undefined,
                resourceType,
                resourceUrl: resourceType !== 'note' ? resourceUrl : undefined,
                content: resourceType === 'note' ? resourceContent : undefined,
            });

            toast.success('Resource added!');
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add resource');
        }
    };

    const handleDeleteResource = async (resource: LessonResource) => {
        if (!confirm(`Delete "${resource.title}"?`)) return;

        try {
            await deleteResource.mutateAsync({
                id: resource.id,
                lessonId: resource.lesson_id,
            });
            toast.success('Resource deleted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete resource');
        }
    };

    const getResourceIcon = (type: LessonResource['resource_type']) => {
        const config = resourceTypeConfig[type];
        const IconComponent = config.icon;
        return <IconComponent className={cn('w-4 h-4', config.color)} />;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Resources & Downloads</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Resource
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                </div>
            ) : resources.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2 px-3 bg-muted/50 rounded-md">
                    No resources yet. Add links, PDFs, documents, or notes.
                </div>
            ) : (
                <div className="space-y-2">
                    {resources.map((resource) => {
                        const config = resourceTypeConfig[resource.resource_type];
                        return (
                            <div
                                key={resource.id}
                                className={cn(
                                    'flex items-center justify-between p-3 rounded-lg border',
                                    config.bgColor
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={cn('p-2 rounded-md', config.bgColor)}>
                                        {getResourceIcon(resource.resource_type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{resource.title}</p>
                                        {resource.description && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {resource.description}
                                            </p>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {config.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {resource.resource_url && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            asChild
                                        >
                                            <a
                                                href={resource.resource_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteResource(resource)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Resource Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Resource</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Resource Type</Label>
                            <Select
                                value={resourceType}
                                onValueChange={(v) => setResourceType(v as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="link">
                                        <div className="flex items-center gap-2">
                                            <Link className="w-4 h-4 text-blue-500" />
                                            External Link
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pdf">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-red-500" />
                                            PDF Document
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="doc">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-blue-600" />
                                            Document
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="file">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-gray-500" />
                                            Other File
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="note">
                                        <div className="flex items-center gap-2">
                                            <StickyNote className="w-4 h-4 text-yellow-500" />
                                            Note / Text
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={resourceTitle}
                                onChange={(e) => setResourceTitle(e.target.value)}
                                placeholder="e.g., Worksheet, Cheatsheet, Further Reading"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input
                                value={resourceDescription}
                                onChange={(e) => setResourceDescription(e.target.value)}
                                placeholder="Brief description of the resource"
                            />
                        </div>

                        {resourceType === 'note' ? (
                            <div className="space-y-2">
                                <Label>Content *</Label>
                                <Textarea
                                    value={resourceContent}
                                    onChange={(e) => setResourceContent(e.target.value)}
                                    placeholder="Write your note here... (Markdown supported)"
                                    rows={6}
                                />
                            </div>
                        ) : resourceType === 'link' ? (
                            <div className="space-y-2">
                                <Label>URL *</Label>
                                <Input
                                    value={resourceUrl}
                                    onChange={(e) => setResourceUrl(e.target.value)}
                                    placeholder="https://example.com/resource"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>File</Label>
                                {resourceUrl ? (
                                    <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                                        <span className="text-sm truncate flex-1">{getShortFilename(resourceUrl)}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setResourceUrl('')}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            value={resourceUrl}
                                            onChange={(e) => setResourceUrl(e.target.value)}
                                            placeholder="Paste URL or upload file"
                                        />
                                        <label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full cursor-pointer"
                                                disabled={isUploading}
                                                asChild
                                            >
                                                <span>
                                                    {isUploading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4 mr-2" />
                                                    )}
                                                    Upload File (Max 50MB)
                                                </span>
                                            </Button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddResource}
                            disabled={createResource.isPending}
                        >
                            {createResource.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Add Resource
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
