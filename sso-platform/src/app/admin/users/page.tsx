"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await admin.listUsers({
        query: {
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (result.data?.users) {
        setUsers(result.data.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean, reason?: string) => {
    setActionLoading(userId);
    try {
      if (ban) {
        await admin.banUser({
          userId,
          banReason: reason || "Banned by admin",
        });
      } else {
        await admin.unbanUser({ userId });
      }
      await loadUsers();
    } catch (error) {
      console.error("Failed to update user ban status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetRole = async (userId: string, role: "user" | "admin") => {
    setActionLoading(userId);
    try {
      await admin.setRole({
        userId,
        role,
      });
      await loadUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card-elevated overflow-hidden border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {(user.name || user.email || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground">
                        {user.name || "No name"}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role || "user"}
                    onChange={(e) => handleSetRole(user.id, e.target.value as "user" | "admin")}
                    disabled={actionLoading === user.id}
                    className="text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      user.banned === true
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {user.banned === true ? "Banned" : "Active"}
                  </span>
                  {user.banReason && (
                    <p className="text-xs text-muted-foreground mt-1">{user.banReason}</p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.banned === true ? (
                    <button
                      onClick={() => handleBanUser(user.id, false)}
                      disabled={actionLoading === user.id}
                      className="text-success hover:text-success/80 disabled:opacity-50"
                    >
                      {actionLoading === user.id ? "..." : "Unban"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = prompt("Ban reason (optional):");
                        handleBanUser(user.id, true, reason || undefined);
                      }}
                      disabled={actionLoading === user.id}
                      className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                    >
                      {actionLoading === user.id ? "..." : "Ban"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                  {searchQuery ? "No users match your search" : "No users found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
