import { useNavigate } from 'react-router-dom';
import { useMyPurchases } from '@/hooks/useDigitalProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function MyPurchases() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: purchases, isLoading } = useMyPurchases();

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Sign In Required</CardTitle>
                        <CardDescription>Please sign in to view your purchases.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate('/login')} className="w-full">
                            Sign In
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto p-6 sm:p-8 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">My Purchases</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Access all your digital products in one place
                    </p>
                </div>

                {/* User Info */}
                <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                    {user.email?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium">{user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                    {purchases?.length || 0} product{purchases?.length === 1 ? '' : 's'} purchased
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Purchases List */}
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {[1, 2].map((i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : purchases?.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-4 bg-muted rounded-full mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                When you purchase digital products, they'll appear here for easy access.
                            </p>
                            <Button onClick={() => navigate('/')}>
                                Browse Products
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {purchases?.map((purchase) => (
                            <Card key={purchase.id} className="group hover:shadow-lg transition-all">
                                <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                                    {purchase.product?.thumbnail_url ? (
                                        <img
                                            src={purchase.product.thumbnail_url}
                                            alt={purchase.product.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FileText className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge className="bg-green-500/90 backdrop-blur-sm">Purchased</Badge>
                                    </div>
                                </div>

                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{purchase.product?.title || 'Product'}</CardTitle>
                                    <CardDescription>
                                        Purchased {format(new Date(purchase.created_at), 'MMM d, yyyy')}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {purchase.product?.description || 'Digital product'}
                                    </p>
                                </CardContent>

                                <CardFooter className="flex justify-between items-center border-t pt-4">
                                    <span className="text-sm font-semibold">₹{purchase.amount}</span>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate(`/view/${purchase.access_token}`)}
                                        className="group-hover:shadow-md transition-shadow"
                                    >
                                        View Product
                                        <ExternalLink className="w-3 h-3 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
