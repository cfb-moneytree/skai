"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label"; // Added for form
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for role select
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Import the browser client


// Define a type for the user object returned by supabase.auth.admin.listUsers()
// This is a simplified version; refer to Supabase docs for the full User type.
interface AdminUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  user_metadata: { [key: string]: any }; // Roles, names etc. are often here
  app_metadata: { [key: string]: any };
  // Add other fields as needed
}

interface ListUsersResponse {
  users: AdminUser[];
  aud: string;
  nextPage?: number | null; // Supabase might use different naming or structure
  lastPage?: number | null;
  total?: number | null;
}


export default function AdminUsersPage() {
  const supabaseBrowserClient = useState(() => createSupabaseBrowserClient())[0]; // Initialize client
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10); // Default items per page
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string | null>(null);
  // const [searchTerm, setSearchTerm] = useState(''); // For future search implementation

  // State for Add User Form
  const [showAddUserForm, setShowAddUserForm] = useState(false); // To toggle form visibility
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user'); // Default role
  const [addUserLoading, setAddUserLoading] = useState(false);
  // const [addUserError, setAddUserError] = useState<string | null>(null); // Replaced by toast
  // const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null); // Replaced by toast

  // State for Edit User Form
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  // Form fields for editing - will be pre-filled from editingUser
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('user');
  const [editUserLoading, setEditUserLoading] = useState(false);
  // const [editUserError, setEditUserError] = useState<string | null>(null); // Replaced by toast
  // const [editUserSuccess, setEditUserSuccess] = useState<string | null>(null); // Replaced by toast

  // State for Delete User action
  const [isUserConfirmDeleteDialogOpen, setIsUserConfirmDeleteDialogOpen] = useState(false);
  const [userToDeleteDetails, setUserToDeleteDetails] = useState<{ id: string; email?: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null); // To show loading on delete button
  // const [deleteUserError, setDeleteUserError] = useState<string | null>(null); // Replaced by toast
  // const [deleteUserSuccess, setDeleteUserSuccess] = useState<string | null>(null); // Replaced by toast


  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch current admin user ID if not already fetched
    if (!currentAdminUserId) {
      try {
        // We need a way to get the current user's ID on the client.
        // Supabase client on the browser can do this.
        // Use the initialized client
        const { data: { user } } = await supabaseBrowserClient.auth.getUser();
        if (user) {
          setCurrentAdminUserId(user.id);
        }
      } catch (e) {
        console.error("Could not fetch current admin user ID for self-delete check:", e);
      }
    }

    try {
      const response = await fetch(`/api/admin/users?page=${page}&perPage=${perPage}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users (status: ${response.status})`);
      }
      const data: ListUsersResponse = await response.json();
      setUsers(data.users || []);
      // Supabase listUsers might not directly return totalPages.
      // It returns `total` (total number of users) and you can calculate totalPages.
      // Or it might return `lastPage`. We'll assume `total` for now.
      if (data.total !== undefined && data.total !== null) {
        setTotalUsers(data.total);
        setTotalPages(Math.ceil(data.total / perPage));
      } else {
        // If total is not available, pagination might be limited
        // For simplicity, if no total, assume current page is the only one unless nextPage is present
        setTotalPages(data.nextPage ? page + 1 : page); // Basic fallback
        setTotalUsers(data.users.length + (page -1) * perPage); // Rough estimate
      }

    } catch (err: any) {
      setError(err.message);
      setUsers([]); // Clear users on error
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  // Helper to format date strings
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateString; // Return original if formatting fails
    }
  };

  // Helper to format role string
  const formatRole = (roleString?: string) => {
    if (!roleString || typeof roleString !== 'string' || roleString.length === 0) return 'N/A';
    return roleString.charAt(0).toUpperCase() + roleString.slice(1).toLowerCase();
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddUserLoading(true);
    // setAddUserError(null); // Replaced by toast
    // setAddUserSuccess(null); // Replaced by toast

    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast.error("Full Name, Email, and Password are required.");
      setAddUserLoading(false);
      return;
    }
    if (newUserPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      setAddUserLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          user_metadata: {
            name: newUserFullName,
            full_name: newUserFullName, // Storing both for consistency with other parts
            role: newUserRole,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to add user (status: ${response.status})`);
      }

      toast.success(`User ${data.user?.email || newUserEmail} created successfully!`);
      // Clear form
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      setShowAddUserForm(false); // Optionally hide form on success
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    setEditUserLoading(true);
    // setEditUserError(null); // Replaced by toast
    // setEditUserSuccess(null); // Replaced by toast

    if (!editUserEmail || !editUserFullName) {
      toast.error("Full Name and Email are required.");
      setEditUserLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          email: editUserEmail,
          user_metadata: {
            name: editUserFullName,
            full_name: editUserFullName,
            role: editUserRole,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to update user (status: ${response.status})`);
      }

      toast.success(`User ${data.user?.email || editUserEmail} updated successfully!`);
      setShowEditUserForm(false);
      setEditingUser(null);
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, userEmail?: string) => {
    if (userId === currentAdminUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }
    setUserToDeleteDetails({ id: userId, email: userEmail });
    setIsUserConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDeleteDetails) return;

    const { id: userId, email: userEmail } = userToDeleteDetails;
    const userNameForConfirm = userEmail || `User ID ${userId}`;

    setIsDeletingUser(userId); // Show loading state
    setIsUserConfirmDeleteDialogOpen(false);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete user (status: ${response.status})`);
      }

      toast.success(data.message || `User ${userNameForConfirm} deleted successfully!`);
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingUser(null); // Reset loading state
      setUserToDeleteDetails(null); // Clear user to delete
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className='mb-1'>Users Management</CardTitle>
            <CardDescription>
              Manage user accounts and permissions. Total Users: {totalUsers > 0 ? totalUsers : 'Loading...'}
            </CardDescription>
          </div>
          {/* <div className="flex flex-col sm:flex-row gap-2"> */}
            {/* <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search users..." className="w-full md:w-[200px] pl-8" disabled /> 
            </div> */}
            <Button onClick={() => setShowAddUserForm(!showAddUserForm)}>
              <Plus className="mr-2 h-4 w-4" /> {showAddUserForm ? 'Cancel' : 'Add User'}
            </Button>
          </div>
      </CardHeader>
      <CardContent>
        {showAddUserForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>Enter the details for the new user account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <Label className='mb-2' htmlFor="newUserFullName">Full Name</Label>
                  <Input
                    id="newUserFullName"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label className='mb-2' htmlFor="newUserEmail">Email</Label>
                  <Input
                    id="newUserEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <Label className='mb-2' htmlFor="newUserPassword">Password</Label>
                  <Input
                    id="newUserPassword"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
                <div>
                  <Label className='mb-2' htmlFor="newUserRole">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger id="newUserRole">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* {addUserError && <p className="text-sm font-medium text-destructive">{addUserError}</p>} */}
                {/* {addUserSuccess && <p className="text-sm font-medium text-green-600">{addUserSuccess}</p>} */}
                {/* Display delete messages near a relevant area, perhaps above the table or in a toast later */}
                {/* {deleteUserError && <p className="text-sm font-medium text-destructive mt-2">{deleteUserError}</p>} */}
                {/* {deleteUserSuccess && <p className="text-sm font-medium text-green-600 mt-2">{deleteUserSuccess}</p>} */}
                <Button type="submit" disabled={addUserLoading}>
                  {addUserLoading ? 'Adding User...' : 'Add User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        {isLoading && <p>Loading users...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead> {/* Typically from user_metadata or profiles table */}
                  <TableHead>Status</TableHead> {/* e.g. email_confirmed_at */}
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>{formatRole(user.user_metadata?.role || user.app_metadata?.role)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.email_confirmed_at ? "default" : "secondary"}
                      >
                        {user.email_confirmed_at ? "Confirmed" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingUser(user);
                              setEditUserFullName(user.user_metadata?.name || user.user_metadata?.full_name || '');
                              setEditUserEmail(user.email || '');
                              setEditUserRole(user.user_metadata?.role || user.app_metadata?.role || 'user');
                              setShowEditUserForm(true);
                             // Clear any previous add/edit messages - not needed with toasts
                             // setAddUserError(null); setAddUserSuccess(null);
                             // setEditUserError(null); setEditUserSuccess(null);
                             setShowAddUserForm(false); // Hide add user form if open
                           }}
                         >
                            Edit user
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>View details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={user.id === currentAdminUserId}
                          >
                            Delete user {user.id === currentAdminUserId && "(Self)"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Edit User Form Modal/Card (simplified as a Card for now) */}
    {showEditUserForm && editingUser && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Edit User: {editingUser.user_metadata?.name || editingUser.email}</CardTitle>
            <CardDescription>Modify the user's details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingUser) {
                handleUpdateUser(editingUser.id);
              }
            }} className="space-y-4">
              <div>
                <Label className='mb-2' htmlFor="editUserFullName">Full Name</Label>
                <Input
                  id="editUserFullName"
                  value={editUserFullName}
                  onChange={(e) => setEditUserFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className='mb-2' htmlFor="editUserEmail">Email</Label>
                <Input
                  id="editUserEmail"
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <Label className='mb-2' htmlFor="editUserRole">Role</Label>
                <Select value={editUserRole} onValueChange={setEditUserRole}>
                  <SelectTrigger id="editUserRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* {editUserError && <p className="text-sm font-medium text-destructive">{editUserError}</p>} */}
              {/* {editUserSuccess && <p className="text-sm font-medium text-green-600">{editUserSuccess}</p>} */}
              <div className="flex gap-2">
                <Button type="submit" disabled={editUserLoading}>
                  {editUserLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditUserForm(false);
                  setEditingUser(null);
                }} disabled={editUserLoading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {userToDeleteDetails && (
        <AlertDialog open={isUserConfirmDeleteDialogOpen} onOpenChange={setIsUserConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user:
                <strong> {userToDeleteDetails.email || `User ID ${userToDeleteDetails.id}`}</strong>.
                All associated data for this user will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDeleteDetails(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                disabled={isDeletingUser === userToDeleteDetails.id}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingUser === userToDeleteDetails.id ? (
                  <MoreHorizontal className="mr-2 h-4 w-4 animate-spin" /> // Using MoreHorizontal as Loader2 might not be imported here
                ) : null}
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
