import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useDigitalProducts, useProductStats } from '@/hooks/useDigitalProducts';
import {
    Plus,
    FileText,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ShoppingBag,
    Download,
    TrendingUp
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function DigitalProducts() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { data: products, isLoading } = useDigitalProducts();
    const { data: stats, isLoading: statsLoading } = useProductStats();

    const handleCopyLink = (slug: string) => {
        if (!profile?.username) return;
        const url = `${window.location.origin}/store/${profile.username}/${slug}`;
        navigator.clipboard.writeText(url);
        // You might want to add a toast here
    };

    return (
        <DashboardLayout>
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Digital Products</h1>
                        <p className="text-muted-foreground mt-2">
                            Sell ebooks, guides, and templates directly to your audience.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/dashboard/products/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Product
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">₹{stats?.totalRevenue || 0}</div>
                                    <p className="text-xs text-muted-foreground">{stats?.totalSales || 0} sales</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{products?.filter(p => p.is_active).length || 0}</div>
                            <p className="text-xs text-muted-foreground">of {products?.length || 0} total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Products Grid */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Your Products</h2>

                    {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="overflow-hidden">
                                    <Skeleton className="h-48 w-full" />
                                    <CardHeader>
                                        <Skeleton className="h-4 w-2/3" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-4 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : products?.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-background rounded-full shadow-sm">
                                    <FileText className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium">No products yet</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
                                Create your first digital product to start selling content.
                            </p>
                            <Button onClick={() => navigate('/dashboard/products/new')}>
                                Create Product
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {products?.map((product) => (
                                <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-all border-border/60">
                                    <div className="aspect-video w-full bg-muted relative overflow-hidden">
                                        {product.thumbnail_url ? (
                                            <img
                                                src={product.thumbnail_url}
                                                alt={product.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                                                <FileText className="w-12 h-12 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <Badge variant={product.is_active ? "default" : "secondary"} className="shadow-sm">
                                                {product.is_active ? 'Active' : 'Draft'}
                                            </Badge>
                                            <Badge variant="secondary" className="font-bold shadow-sm bg-background/80 backdrop-blur-sm">
                                                ₹{product.price}
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="line-clamp-1 text-lg">{product.title}</CardTitle>
                                        <CardDescription className="line-clamp-2 text-xs">
                                            {format(new Date(product.created_at), 'MMM d, yyyy')}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="p-4 pt-2">
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {product.description || "No description provided."}
                                        </p>
                                    </CardContent>

                                    <CardFooter className="p-4 pt-0 flex justify-between items-center border-t border-border/50 mt-4 bg-muted/20">
                                        <Button variant="ghost" size="sm" onClick={() => handleCopyLink(product.slug)}>
                                            Copy Link
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/products/${product.id}`)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`/store/${profile?.username}/${product.slug}`, '_blank')}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Page
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
