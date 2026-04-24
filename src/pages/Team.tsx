import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, Plus, MoreVertical, Mail, Shield, Crown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  status: 'active' | 'pending';
}

const ROLE_LABELS = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Member', icon: Users, color: 'text-muted-foreground' },
};

export default function Team() {
  const { profile, user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isAdding, setIsAdding] = useState(false);

  // Mock team members (in real app, fetch from database)
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: user?.id || '1',
      name: profile?.name || 'You',
      email: user?.email || '',
      role: 'owner',
      avatar: profile?.avatar_url || undefined,
      status: 'active',
    },
  ]);

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsAdding(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(`Member added: ${inviteEmail}`);
    setInviteEmail('');
    setIsAddOpen(false);
    setIsAdding(false);
  };

  const handleRemoveMember = (memberId: string) => {
    toast.success('Team member removed');
  };

  const handleChangeRole = (memberId: string, newRole: 'admin' | 'member') => {
    toast.success('Role updated');
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-muted-foreground">Manage your team members and their permissions</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a new member to your team workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v: 'admin' | 'member') => setInviteRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Admin - Can manage team and settings
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Member - Can view and use calendar
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={isAdding}>
                  {isAdding ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Members List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Team Members</h3>
              <Badge variant="secondary" className="ml-2">{teamMembers.length}</Badge>
            </div>
          </div>

          <div className="divide-y divide-border">
            {teamMembers.map((member) => {
              const RoleIcon = ROLE_LABELS[member.role].icon;

              return (
                <div
                  key={member.id}
                  className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      {member.status === 'pending' && (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <RoleIcon className={cn("w-4 h-4", ROLE_LABELS[member.role].color)} />
                    <span className="text-sm font-medium">{ROLE_LABELS[member.role].label}</span>
                  </div>

                  {member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                          <Shield className="w-4 h-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                          <Users className="w-4 h-4 mr-2" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          Remove from team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions Info */}
        <div className="mt-6 bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Role Permissions</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Owner</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full access to everything</li>
                <li>• Manage billing & subscription</li>
                <li>• Delete workspace</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage team members</li>
                <li>• Edit all event types</li>
                <li>• View all bookings</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage own event types</li>
                <li>• View own bookings</li>
                <li>• Edit own availability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}