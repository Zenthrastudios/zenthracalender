import { useState } from 'react';
import { useSupportTickets, useUpdateSupportTicket, SupportTicket } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    MessageSquare, Clock, CheckCircle2, ChevronRight, Filter, 
    Search, User, Mail, GraduationCap, Layout, Inbox, 
    MoreHorizontal, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export default function SupportTickets() {
    const { data: tickets, isLoading } = useSupportTickets();
    const updateTicket = useUpdateSupportTicket();
    const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'resolved' | 'closed'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTickets = (tickets || []).filter(ticket => {
        const matchesFilter = filter === 'all' || ticket.status === filter;
        const matchesSearch = 
            ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleStatusUpdate = async (id: string, status: SupportTicket['status']) => {
        try {
            await updateTicket.mutateAsync({ id, status });
            toast.success(`Ticket status updated to ${status}`);

            // If resolved, trigger WhatsApp alert
            if (status === 'resolved') {
                supabase.functions.invoke('send-whatsapp-message', {
                    body: {
                        type: 'support_ticket_resolved',
                        ticketId: id
                    }
                }).catch(err => console.error('WhatsApp notification failed', err));
            }
        } catch (error) {
            toast.error('Failed to update ticket status');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 uppercase text-[10px] font-black tracking-widest border-none">Pending</Badge>;
            case 'in-progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase text-[10px] font-black tracking-widest border-none">In Progress</Badge>;
            case 'resolved': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 uppercase text-[10px] font-black tracking-widest border-none">Resolved</Badge>;
            case 'closed': return <Badge variant="outline" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest border-zinc-100">Closed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Clock className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 p-6 md:p-10 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                            <Inbox className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Support Desk</h1>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium italic">Manage and resolve inquiries from your students and customers.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {(['all', 'pending', 'in-progress', 'resolved', 'closed'] as const).map((s) => (
                        <Button
                            key={s}
                            variant={filter === s ? 'default' : 'outline'}
                            onClick={() => setFilter(s)}
                            className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl ${
                                filter === s ? 'bg-orange-600 hover:bg-orange-700 text-white border-none' : 'border-zinc-100 hover:border-orange-200 hover:bg-orange-50'
                            }`}
                        >
                            {s}
                        </Button>
                    ))}
                </div>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                    placeholder="Search by customer, email or subject..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-14 pl-12 bg-white border-zinc-100 rounded-2xl font-bold focus:ring-orange-600 shadow-sm"
                />
            </div>

            <div className="grid gap-6">
                {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                        <Card key={ticket.id} className="overflow-hidden border-zinc-100 shadow-sm hover:shadow-xl transition-all rounded-3xl group">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row md:items-stretch">
                                    {/* Left: Customer Info */}
                                    <div className="p-8 md:w-80 bg-zinc-50/50 border-b md:border-b-0 md:border-r border-zinc-100 flex flex-col justify-between gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 border-4 border-white shadow-md flex items-center justify-center text-xs font-black text-orange-600">
                                                    {ticket.customer_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black italic text-sm tracking-tight leading-none">{ticket.customer_name}</p>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{ticket.customer_email}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1 bg-white p-3 rounded-xl border border-zinc-100">
                                                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                                    {ticket.course_id ? <GraduationCap className="w-3 h-3 text-orange-600" /> : <Layout className="w-3 h-3 text-blue-600" />}
                                                    Assigned Content
                                                </div>
                                                <p className="text-[10px] font-black italic line-clamp-1">
                                                    {ticket.courses?.title || ticket.digital_products?.title || 'General Inquiry'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                Reported At
                                            </div>
                                            <p className="text-[10px] font-black italic">{format(new Date(ticket.created_at), 'PPPp')}</p>
                                        </div>
                                    </div>

                                    {/* Right: Content & Action */}
                                    <div className="p-8 flex-1 flex flex-col justify-between gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <h3 className="text-xl font-black italic tracking-tight uppercase leading-tight group-hover:text-orange-600 transition-colors">
                                                    {ticket.subject}
                                                </h3>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                            <p className="text-sm text-zinc-600 font-medium italic leading-relaxed whitespace-pre-wrap bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                                                "{ticket.message}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-zinc-300" />
                                                <a 
                                                    href={`mailto:${ticket.customer_email}?subject=Re: ${ticket.subject}`}
                                                    className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 hover:underline"
                                                >
                                                    Send Email Response
                                                </a>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-10 px-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 font-black uppercase text-[10px] tracking-widest gap-2">
                                                        Update Status
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="p-2 rounded-2xl border-zinc-100 shadow-2xl">
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(ticket.id, 'pending')} className="rounded-xl font-black uppercase text-[10px] tracking-widest p-3">Pending</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(ticket.id, 'in-progress')} className="rounded-xl font-black uppercase text-[10px] tracking-widest p-3">In Progress</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(ticket.id, 'resolved')} className="rounded-xl font-black uppercase text-[10px] tracking-widest p-3 text-emerald-600">Mark Resolved</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(ticket.id, 'closed')} className="rounded-xl font-black uppercase text-[10px] tracking-widest p-3 text-zinc-400">Close Ticket</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="py-24 flex flex-col items-center justify-center gap-6 bg-white border-2 border-dashed border-zinc-100 rounded-[40px] text-center">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                            <Inbox className="w-10 h-10 text-zinc-200" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase">Inbox is Empty</h3>
                            <p className="text-sm text-zinc-400 font-medium italic">No support tickets match your current filters.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
