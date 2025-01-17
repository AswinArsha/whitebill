import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useNavigate } from 'react-router-dom';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader, Filter, Plus, Key, UserPlus } from "lucide-react";

const AdminHome = ({ role, userId, isAuthenticated }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const navigate = useNavigate();

  // New User Form State
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    department: '',
    position: '',
    role: 'user',
    organization_id: '',
  });
  const [newPassword, setNewPassword] = useState('');

  // Filter users based on selected organization
  useEffect(() => {
    if (selectedOrg === 'all') {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(user => 
        user.organization_id?.toString() === selectedOrg
      ));
    }
  }, [selectedOrg, users]);

  const resetNewUser = () => {
    setNewUser({
      username: '',
      password: '',
      name: '',
      department: '',
      position: '',
      role: 'user',
      organization_id: '',
    });
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name || !newUser.department || !newUser.position) {
      showAlert('All fields are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...newUser,
          subscription_status: true,
          show: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchUsers();
      setShowNewUserDialog(false);
      resetNewUser();
      showAlert('User created successfully', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showAlert('Error creating user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!newPassword || !selectedUserId) {
      showAlert('Password is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', selectedUserId);

      if (error) throw error;
      
      setShowPasswordDialog(false);
      setNewPassword('');
      setSelectedUserId(null);
      showAlert('Password updated successfully', 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      showAlert('Error updating password', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Define showAlert first since it's used in other functions
  const showAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'info' }), 3000);
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      showAlert('Error fetching organizations', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      // First fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Then fetch organizations separately
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

      if (orgsError) throw orgsError;

      // Combine the data
      const usersWithOrgs = usersData.map(user => ({
        ...user,
        organizations: orgsData.find(org => org.id === user.organization_id)
      }));

      setUsers(usersWithOrgs);
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert('Error fetching users', 'error');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

  const createOrganization = async () => {
    if (!newOrgName.trim()) {
      showAlert('Organization name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{ name: newOrgName }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchOrganizations();
      setNewOrgName('');
      showAlert('Organization created successfully', 'success');
    } catch (error) {
      console.error('Error creating organization:', error);
      showAlert('Error creating organization', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserSubscription = async (userId, newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ subscription_status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      showAlert('Subscription status updated successfully', 'success');
    } catch (error) {
      console.error('Error updating subscription:', error);
      showAlert('Error updating subscription status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserOrganization = async (userId, organizationId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      showAlert('Organization updated successfully', 'success');
    } catch (error) {
      console.error('Error updating organization:', error);
      showAlert('Error updating organization', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newUser.department}
                onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                placeholder="Enter department"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={newUser.position}
                onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                placeholder="Enter position"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={newUser.organization_id}
                onValueChange={(value) => setNewUser({...newUser, organization_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={createUser}
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader className="animate-spin mr-2" /> : null}
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button 
              onClick={updatePassword}
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader className="animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
            <p className="text-gray-500">Welcome, Super Admin</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </CardHeader>
        <CardContent>
          {alert.show && (
            <Alert className={`mb-4 ${alert.type === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Organization Creation Section */}
          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Organization</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>
              <Button 
                onClick={createOrganization}
                disabled={loading}
              >
                {loading ? <Loader className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Organization
              </Button>
            </div>
          </div>

          {/* User Management Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">User Management</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <Select
                      value={selectedOrg}
                      onValueChange={setSelectedOrg}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setShowNewUserDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={user.organization_id?.toString()}
                            onValueChange={(value) => updateUserOrganization(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Switch
                            checked={user.subscription_status}
                            onCheckedChange={(checked) => updateUserSubscription(user.id, checked)}
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowPasswordDialog(true);
                            }}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            Change Password
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHome;