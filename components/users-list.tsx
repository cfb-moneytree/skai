"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

type User = {
  user_id: string;
  full_name: string;
  email: string;
};

interface UsersListProps {
  users: User[];
  onDeleteUser: (user: User) => void;
  isLoading: boolean;
  error: string | null;
  selectedUsers?: string[];
  onSelectedUsersChange?: (selectedUsers: string[]) => void;
}

export function UsersList({
  users,
  onDeleteUser,
  isLoading,
  error,
  selectedUsers = [],
  onSelectedUsersChange,
}: UsersListProps) {
  const handleSelectAll = (checked: boolean) => {
    if (onSelectedUsersChange) {
      onSelectedUsersChange(checked ? users.map((user) => user.user_id) : []);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (onSelectedUsersChange) {
      const newSelectedUsers = checked
        ? [...selectedUsers, userId]
        : selectedUsers.filter((id) => id !== userId);
      onSelectedUsersChange(newSelectedUsers);
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm font-medium text-destructive">{error}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {onSelectedUsersChange && (
            <TableHead className="w-12">
              <Checkbox
                checked={
                  selectedUsers.length > 0 && selectedUsers.length === users.length
                    ? true
                    : selectedUsers.length > 0
                    ? "indeterminate"
                    : false
                }
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
          )}
          <TableHead>Full Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.user_id}>
            {onSelectedUsersChange && (
              <TableCell>
                <Checkbox
                  checked={selectedUsers.includes(user.user_id)}
                  onCheckedChange={(checked) => handleSelectUser(user.user_id, !!checked)}
                />
              </TableCell>
            )}
            <TableCell>{user.full_name}</TableCell>
            <TableCell>
              {user.email}
            </TableCell>
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
                  <DropdownMenuItem asChild>
                    <Link href={`/users/${user.user_id}`}>View</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteUser(user)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}