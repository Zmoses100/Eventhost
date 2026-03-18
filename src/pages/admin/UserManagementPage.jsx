import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Edit, Trash2, Search, KeyRound, Loader2, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { backendClient } from '@/lib/backendClient';
import ManageUserCredentialsDialog from '@/components/admin/ManageUserCredentialsDialog';

const UserForm = ({ user, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState(
    user || { name: '', email: '', role: 'Attendee', status: 'Active', password: '' }
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({ name: '', email: '', role: 'Attendee', status: 'Active', password: '' });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogDescription>
          {user ? 'Update the user details below.' : 'Fill in the details for the new user.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right text-white">Name</Label>
          <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} className="col-span-3 bg-white/10 border-white/20 text-white" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right text-white">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} className="col-span-3 bg-white/10 border-white/20 text-white" disabled={!!user} />
        </div>
        {!user && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right text-white">Password</Label>
            <div className="col-span-3 relative">
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} className="bg-white/10 border-white/20 text-white pr-10" placeholder="Set a password" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-white/70" onClick={() => setShowPassword(!showPassword)}>
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="role" className="text-right text-white">Role</Label>
          <Select name="role" value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
            <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Attendee">Attendee</SelectItem>
              <SelectItem value="Event Organizer">Event Organizer</SelectItem>
              <SelectItem value="Speaker">Speaker</SelectItem>
              <SelectItem value="Super Admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="status" className="text-right text-white">Status</Label>
          <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
            <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogClose>
        <Button type="submit" className="bg-white text-purple-600 hover:bg-white/90" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
};

const AdminUserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [selectedUserForCredentials, setSelectedUserForCredentials] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await backendClient.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error fetching users", description: error.message, variant: "destructive" });
    } else {
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveUser = async (userData) => {
    setSaving(true);
    if (editingUser) {
      const { data, error } = await backendClient
        .from('profiles')
        .update({ name: userData.name, role: userData.role, status: userData.status })
        .eq('id', editingUser.id)
        .select();
      
      if (error) {
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'User Updated', description: 'User details have been successfully updated.' });
        fetchUsers();
        setIsFormOpen(false);
        setEditingUser(null);
      }
    } else {
      const { error, data } = await backendClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
          }
        }
      });

      if (error) {
        toast({ title: 'User Creation Failed', description: error.message, variant: 'destructive' });
      } else {
        const warning = data?.meta?.warnings?.[0];
        toast({
          title: 'User Added',
          description: warning || (data?.meta?.requires_email_verification
            ? 'New user created. A verification email was sent if email delivery is configured.'
            : 'New user has been created successfully.'),
          variant: warning ? 'destructive' : 'default',
        });
        fetchUsers();
        setIsFormOpen(false);
      }
    }
    setSaving(false);
  };
  
  const handleDeleteUser = async (userId) => {
    const { error } = await backendClient.from('profiles').delete().eq('id', userId);
    if (error) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User Deleted', description: 'The user profile has been deleted. Note: The auth entry may still exist.', variant: 'default' });
      fetchUsers();
    }
  };

  const handleOpenCredentialsDialog = (user) => {
    setSelectedUserForCredentials(user);
    setIsCredentialsDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pt-12 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center mb-8">
          <Link to="/super-admin/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white">User Management</h1>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Card className="glass-effect border-white/20">
            <CardHeader>
                <div className="flex justify-between items-center">
                <CardTitle className="text-2xl text-white">All Users</CardTitle>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingUser(null)} className="bg-white text-purple-600 hover:bg-white/90">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </DialogTrigger>
                </div>
                <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white w-full md:w-1/3"
                />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                        <thead>
                        <tr className="border-b border-white/20">
                            <th className="text-left p-4 font-medium">Name</th>
                            <th className="text-left p-4 font-medium">Email</th>
                            <th className="text-left p-4 font-medium">Role</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-right p-4 font-medium">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4">{user.name}</td>
                            <td className="p-4">{user.email}</td>
                            <td className="p-4">{user.role}</td>
                            <td className="p-4">
                                <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={user.status === 'Active' ? 'bg-green-500/80' : 'bg-gray-500/80'}>
                                {user.status}
                                </Badge>
                            </td>
                            <td className="p-4 text-right">
                                <Button onClick={() => handleOpenCredentialsDialog(user)} variant="ghost" size="icon" className="text-white/80 hover:text-white">
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setEditingUser(user)} variant="ghost" size="icon" className="text-white/80 hover:text-white">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the user's profile. The user's authentication record will remain but they will lose all profile data.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                  </div>
                )}
            </CardContent>
            </Card>
            <DialogContent>
                <UserForm 
                    user={editingUser} 
                    onSave={handleSaveUser} 
                    onCancel={() => { setEditingUser(null); setIsFormOpen(false); }}
                    saving={saving}
                />
            </DialogContent>
        </Dialog>
        <ManageUserCredentialsDialog
          open={isCredentialsDialogOpen}
          onOpenChange={setIsCredentialsDialogOpen}
          user={selectedUserForCredentials}
          onSuccess={() => {
            fetchUsers();
            setIsCredentialsDialogOpen(false);
          }}
        />
      </motion.div>
    </div>
  );
};

export default AdminUserManagementPage;
