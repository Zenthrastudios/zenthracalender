import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useDigitalProduct, useCreateProduct, useUpdateProduct, useUploadProductFile } from '@/hooks/useDigitalProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Upload, FileText, Image as ImageIcon, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getShortFilename } from '@/lib/fileUtils';

export default function DigitalProductEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const { data: existingProduct, isLoading: isLoadingProduct } = useDigitalProduct(id);
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();
    const uploadFile = useUploadProductFile();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        slug: '',
        is_active: true
    });

    const [productFile, setProductFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const productFileInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (existingProduct) {
            setFormData({
                title: existingProduct.title,
                description: existingProduct.description || '',
                price: existingProduct.price.toString(),
                slug: existingProduct.slug,
                is_active: existingProduct.is_active || true
            });
            setExistingFileUrl(existingProduct.file_url);
            setExistingThumbnailUrl(existingProduct.thumbnail_url);
        }
    }, [existingProduct]);

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        setFormData(prev => ({
            ...prev,
            title,
            slug: !isEditMode ? generateSlug(title) : prev.slug // Only auto-generate slug on create
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.price || !formData.slug) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (!isEditMode && !productFile) {
            toast.error('Please upload a digital product file');
            return;
        }

        setIsSubmitting(true);

        try {
            let finalFileUrl = existingFileUrl;
            let finalThumbnailUrl = existingThumbnailUrl;

            // 1. Upload Product File if changed
            if (productFile) {
                const path = `products/${Date.now()}_${productFile.name}`;
                await uploadFile.mutateAsync({
                    file: productFile,
                    bucket: 'digital-products',
                    path
                });
                // Note: For now we store the path. In a real app we'd want to ensure this bucket is private
                // and generation signed URLs.
                finalFileUrl = path;
            }

            // 2. Upload Thumbnail if changed
            if (thumbnailFile) {
                const path = `thumbnails/${Date.now()}_${thumbnailFile.name}`;
                await uploadFile.mutateAsync({
                    file: thumbnailFile,
                    bucket: 'public-images', // Use public bucket for thumbnails
                    path
                });
                // Get the public URL using Supabase client
                const { data: publicUrlData } = supabase
                    .storage
                    .from('public-images')
                    .getPublicUrl(path);

                finalThumbnailUrl = publicUrlData.publicUrl;
            }

            if (!finalFileUrl) throw new Error("File URL is missing");

            const productData = {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                slug: formData.slug,
                is_active: formData.is_active,
                file_url: finalFileUrl,
                file_type: 'pdf', // Hardcoded for now, or detect from file
                thumbnail_url: finalThumbnailUrl
            };

            if (isEditMode && id) {
                await updateProduct.mutateAsync({ id, ...productData });
                toast.success('Product updated successfully');
            } else {
                await createProduct.mutateAsync(productData);
                toast.success('Product created successfully');
            }

            navigate('/dashboard/products');

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to save product');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isEditMode && isLoadingProduct) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/products')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Product' : 'New Product'}</h1>
                        <p className="text-muted-foreground">details and file upload</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Main Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Product Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={handleTitleChange}
                                placeholder="search engine optimization guide..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground bg-muted p-2 rounded-md">/store/username/</span>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="What will the customer get?"
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Price (₹)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="499"
                            />
                        </div>
                    </div>

                    {/* File Uploads */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Main File */}
                        <div className="space-y-2">
                            <Label>Digital File (PDF)</Label>
                            <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                                <CardContent className="flex flex-col items-center justify-center py-6 text-center cursor-pointer" onClick={() => productFileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={productFileInputRef}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setProductFile(file);
                                        }}
                                    />
                                    {productFile ? (
                                        <div className="flex items-center gap-2 text-primary font-medium">
                                            <FileText className="w-8 h-8" />
                                            <span className="truncate max-w-[200px]">{productFile.name}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setProductFile(null); }}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : existingFileUrl ? (
                                        <div className="flex items-center gap-2 text-primary font-medium">
                                            <FileText className="w-8 h-8" />
                                            <div className="flex flex-col items-start bg-muted px-2 py-1 rounded">
                                                <span className="text-xs text-muted-foreground">Current File:</span>
                                                <span className="truncate max-w-[200px]">{getShortFilename(existingFileUrl)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                            <p className="text-sm font-medium">Click to upload file</p>
                                            <p className="text-xs text-muted-foreground">PDF or Doc (max 50MB)</p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Thumbnail */}
                        <div className="space-y-2">
                            <Label>Thumbnail Image</Label>
                            <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                                <CardContent className="flex flex-col items-center justify-center py-6 text-center cursor-pointer" onClick={() => thumbnailInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={thumbnailInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setThumbnailFile(file);
                                        }}
                                    />
                                    {thumbnailFile ? (
                                        <div className="relative">
                                            <img src={URL.createObjectURL(thumbnailFile)} className="h-32 w-auto object-cover rounded-md" />
                                            <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); }}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : existingThumbnailUrl ? (
                                        <div className="relative group">
                                            <img src={existingThumbnailUrl} className="h-32 w-auto object-cover rounded-md opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                Change
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                                            <p className="text-sm font-medium">Upload Cover Image</p>
                                            <p className="text-xs text-muted-foreground">16:9 recommended</p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-xs text-muted-foreground">Visible in your public store</p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_active: c }))}
                        />
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => navigate('/dashboard/products')}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {isEditMode ? 'Saving...' : 'Creating...'}
                                </>
                            ) : (
                                isEditMode ? 'Save Changes' : 'Create Product'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
