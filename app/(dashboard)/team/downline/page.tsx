"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAPI, useAuthToken } from "@/lib/hooks/use-api";
import { useMyDistributor } from "@/lib/hooks/use-distributor";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, getInitials } from "@/lib/utils";
import { RANK_COLORS } from "@/lib/constants";
import type { TeamMember } from "@/lib/types";

function TreeNode({
  member,
  depth = 0,
  onExpand,
  expandedIds,
  loadingIds,
  childrenMap,
}: {
  member: TeamMember;
  depth?: number;
  onExpand: (id: string) => void;
  expandedIds: Set<string>;
  loadingIds: Set<string>;
  childrenMap: Map<string, TeamMember[]>;
}) {
  const isExpanded = expandedIds.has(member.id);
  const isLoading = loadingIds.has(member.id);
  const children = childrenMap.get(member.id) || [];
  const hasChildren = (member.downlineCount || 0) > 0;
  const rankColor = RANK_COLORS[member.rank] || "#6b7280";

  return (
    <div className="relative">
      {/* Connecting line */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 h-8 border-l-2 border-border"
          style={{ marginLeft: `${(depth - 1) * 32 + 16}px` }}
        />
      )}

      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors"
        style={{ paddingLeft: `${depth * 32 + 16}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => onExpand(member.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-muted hover:text-foreground transition-colors flex-shrink-0"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        ) : (
          <div className="w-6 flex-shrink-0" />
        )}

        {/* Avatar */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: rankColor }}
        >
          {getInitials(member.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {member.name}
            </span>
            <Badge variant="info">{member.rank}</Badge>
          </div>
          <p className="text-xs text-muted">
            {member.referralCode} &middot; {formatCurrency(member.totalSales)} sales
          </p>
        </div>

        {/* Downline count */}
        {hasChildren && (
          <span className="text-xs text-muted flex-shrink-0">
            {member.downlineCount} member{(member.downlineCount || 0) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              member={child}
              depth={depth + 1}
              onExpand={onExpand}
              expandedIds={expandedIds}
              loadingIds={loadingIds}
              childrenMap={childrenMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DownlinePage() {
  const { data: me } = useMyDistributor();
  const distributorId = me?.id;
  const { data: initialDownline, isLoading } = useAPI<TeamMember[]>(
    distributorId ? `/distributors/${distributorId}/downline?depth=1` : null
  );
  const getToken = useAuthToken();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Map<string, TeamMember[]>>(new Map());
  const [search, setSearch] = useState("");

  const handleExpand = useCallback(
    async (id: string) => {
      if (expandedIds.has(id)) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      if (childrenMap.has(id)) {
        setExpandedIds((prev) => new Set(prev).add(id));
        return;
      }

      setLoadingIds((prev) => new Set(prev).add(id));
      try {
        const token = await getToken();
        const children = await api.get<TeamMember[]>(
          `/distributors/${id}/downline?depth=1`,
          token
        );
        setChildrenMap((prev) => new Map(prev).set(id, children));
        setExpandedIds((prev) => new Set(prev).add(id));
      } catch {
        // Handle error silently
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [expandedIds, childrenMap, getToken]
  );

  const filteredDownline = (initialDownline || []).filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.referralCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/team"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Team
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Downline Tree</h1>
        <p className="mt-1 text-muted">
          Explore your team hierarchy. Click to expand each level.
        </p>
      </div>

      <Input
        placeholder="Search by name or referral code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />

      <div className="glass rounded-2xl p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredDownline.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            title="No downline members"
            description="Your team members will appear here once they join through your referral link."
          />
        ) : (
          <div className="space-y-0.5">
            {filteredDownline.map((member) => (
              <TreeNode
                key={member.id}
                member={member}
                onExpand={handleExpand}
                expandedIds={expandedIds}
                loadingIds={loadingIds}
                childrenMap={childrenMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
