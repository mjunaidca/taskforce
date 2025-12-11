"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { OrgDetailsModal } from "./OrgDetailsModal";
import { BulkActionsBar } from "./BulkActionsBar";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  memberCount: number;
  ownerEmail: string;
}

interface AdminOrgTableProps {
  organizations: Organization[];
  currentPage: number;
  totalPages: number;
  total: number;
}

export function AdminOrgTable({
  organizations,
  currentPage,
  totalPages,
  total,
}: AdminOrgTableProps) {
  const router = useRouter();
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [detailsOrgId, setDetailsOrgId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedOrgs.size === organizations.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(organizations.map((org) => org.id)));
    }
  };

  const toggleSelectOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgs);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const handlePageChange = (page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", page.toString());
    router.push(url.pathname + url.search);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Bulk Actions Bar */}
      {selectedOrgs.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedOrgs.size}
          selectedOrgIds={Array.from(selectedOrgs)}
          onClearSelection={() => setSelectedOrgs(new Set())}
        />
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search organizations by name or slug..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-taskflow-500"
            />
          </div>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-taskflow-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-taskflow-500">
            <option value="">Any Size</option>
            <option value="small">1-10 members</option>
            <option value="medium">11-50 members</option>
            <option value="large">51+ members</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrgs.size === organizations.length && organizations.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-taskflow-600 focus:ring-taskflow-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Members
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {organizations.map((org) => (
              <tr
                key={org.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedOrgs.has(org.id)}
                    onChange={() => toggleSelectOrg(org.id)}
                    className="rounded border-slate-300 text-taskflow-600 focus:ring-taskflow-500"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-taskflow-500 to-taskflow-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">{org.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    @{org.slug}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-900">{org.memberCount}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-600">{org.ownerEmail}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-600">
                    {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailsOrgId(org.id)}
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing {(currentPage - 1) * 50 + 1} to{" "}
          {Math.min(currentPage * 50, total)} of {total} organizations
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? "bg-taskflow-500 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Details Modal */}
      {detailsOrgId && (
        <OrgDetailsModal
          orgId={detailsOrgId}
          onClose={() => setDetailsOrgId(null)}
        />
      )}
    </div>
  );
}
