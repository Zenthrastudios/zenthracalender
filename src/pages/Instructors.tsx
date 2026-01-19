import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useInstructors, useCreateInstructor, useDeleteInstructor, useUpdateInstructor } from '@/hooks/useInstructors';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, Plus, MoreVertical, Mail, Trash2, Edit, Eye, EyeOff, UserPlus, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

export default function Instructors() {
  const { data: instructors, isLoading } = useInstructors();
  const createInstructor = useCreateInstructor();
  const deleteInstructor = useDeleteInstructor();
  const updateInstructor = useUpdateInstructor();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editInstructorId, setEditInstructorId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [addAvatarFile, setAddAvatarFile] = useState<File | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const addAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const editAvatarFileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setBio('');
    setSpecialization('');
    setPhone('');
    setAvatarUrl('');
    setEditIsActive(true);
    setAddAvatarFile(null);
    setEditAvatarFile(null);
    setShowPassword(false);
  };

  const uploadPublicImage = async (folder: string, file: File) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('public-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const openEditInstructor = (instructorId: string) => {
    const instructor = instructors?.find((i) => i.id === instructorId);
    if (!instructor) return;

    setEditInstructorId(instructor.id);
    setName(instructor.name);
    setEmail(instructor.email);
    setBio(instructor.bio || '');
    setSpecialization(instructor.specialization || '');
    setAvatarUrl(instructor.avatar_url || '');
    setPhone(instructor.phone || '');
    setEditIsActive(instructor.is_active);
    setEditAvatarFile(null);
    setIsEditOpen(true);
  };

  const handleEditInstructor = async () => {
    if (!editInstructorId) return;
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAvatarUrl: string | null = avatarUrl.trim() ? avatarUrl.trim() : null;
      if (editAvatarFile) {
        setIsAvatarUploading(true);
        finalAvatarUrl = await uploadPublicImage(`instructors/${editInstructorId}`, editAvatarFile);
      }

      await updateInstructor.mutateAsync({
        id: editInstructorId,
        name,
        bio: bio || null,
        specialization: specialization || null,
        phone: phone || null,
        avatar_url: finalAvatarUrl,
        is_active: editIsActive,
      });
      toast.success('Instructor updated');
      setIsEditOpen(false);
      setEditInstructorId(null);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update instructor';
      toast.error(message);
    } finally {
      setIsAvatarUploading(false);
      setIsSubmitting(false);
    }
  };

  const handleAddInstructor = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter an email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createInstructor.mutateAsync({
        name,
        email,
        password,
        phone: phone || undefined,
        bio: bio || undefined,
        specialization: specialization || undefined,
      });

      if (addAvatarFile) {
        setIsAvatarUploading(true);
        const avatarPublicUrl = await uploadPublicImage(`instructors/${created.id}`, addAvatarFile);
        await updateInstructor.mutateAsync({ id: created.id, avatar_url: avatarPublicUrl });
      }
      toast.success(`Instructor ${name} added successfully`);
      resetForm();
      setIsAddOpen(false);
    } catch (error: any) {
      console.error('Error creating instructor:', error);
      toast.error(error.message || 'Failed to add instructor');
    } finally {
      setIsAvatarUploading(false);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteInstructor.mutateAsync(deleteId);
      toast.success('Instructor removed');
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove instructor');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateInstructor.mutateAsync({ id, is_active: !currentStatus });
      toast.success(currentStatus ? 'Instructor deactivated' : 'Instructor activated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Instructors</h1>
            <p className="text-muted-foreground">Manage instructors who can be assigned to events</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Instructor</DialogTitle>
                <DialogDescription>
                  Create an instructor account. They can log in with these credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{name.charAt(0).toUpperCase() || 'I'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={addAvatarFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        aria-label="Upload instructor avatar"
                        title="Upload instructor avatar"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select an image file');
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image must be less than 5MB');
                            return;
                          }
                          setAddAvatarFile(file);
                          setAvatarUrl(URL.createObjectURL(file));
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => addAvatarFileInputRef.current?.click()}>
                        Upload
                      </Button>
                      {avatarUrl && (
                        <Button type="button" variant="outline" size="sm" onClick={() => { setAddAvatarFile(null); setAvatarUrl(''); }}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="instructor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    placeholder="e.g., Yoga, Meditation, Fitness"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Brief description about the instructor..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsAddOpen(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddInstructor} disabled={isSubmitting || isAvatarUploading}>
                  {isSubmitting || isAvatarUploading ? 'Creating...' : 'Add Instructor'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Instructors List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">All Instructors</h3>
              <Badge variant="secondary" className="ml-2">{instructors?.length || 0}</Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading instructors...
            </div>
          ) : instructors?.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No instructors yet</h3>
              <p className="text-muted-foreground mb-4">
                Add instructors to assign them to event types
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Instructor
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {instructors?.map((instructor) => (
                <div
                  key={instructor.id}
                  className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={instructor.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {instructor.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{instructor.name}</p>
                      {!instructor.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {instructor.email}
                    </p>
                    {instructor.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="w-3 h-3">📞</span>
                        {instructor.phone}
                      </p>
                    )}
                    {instructor.specialization && (
                      <p className="text-sm text-primary">{instructor.specialization}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground hidden sm:block">
                      Added {format(new Date(instructor.created_at), 'MMM d, yyyy')}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={instructor.is_active}
                        onCheckedChange={() => handleToggleActive(instructor.id, instructor.is_active)}
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditInstructor(instructor.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(instructor.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Instructor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Instructor */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditInstructorId(null);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Instructor</DialogTitle>
              <DialogDescription>
                Update instructor details shown in the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">{name.charAt(0).toUpperCase() || 'I'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={editAvatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-label="Upload instructor avatar"
                      title="Upload instructor avatar"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          toast.error('Please select an image file');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image must be less than 5MB');
                          return;
                        }
                        setEditAvatarFile(file);
                        setAvatarUrl(URL.createObjectURL(file));
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => editAvatarFileInputRef.current?.click()}>
                      Upload
                    </Button>
                    {avatarUrl && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setEditAvatarFile(null); setAvatarUrl(''); }}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input id="edit-email" value={email} disabled />
                <p className="text-xs text-muted-foreground">Email changes are not supported here.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-specialization">Specialization</Label>
                <Input
                  id="edit-specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio (Optional)</Label>
                <Textarea id="edit-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Active</Label>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditInstructor} disabled={isSubmitting || isAvatarUploading}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <div className="mt-6 bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-2">How Instructors Work</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Instructors can log in with their email and password</li>
            <li>• Assign instructors to event types when creating events</li>
            <li>• Guests will see the assigned instructor when booking</li>
            <li>• Deactivating an instructor hides them from new events</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Instructor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the instructor from your team. They will no longer be able to access the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
