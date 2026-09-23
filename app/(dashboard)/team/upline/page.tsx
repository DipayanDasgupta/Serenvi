"use client";

import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { useMyDistributor } from "@/lib/hooks/use-distributor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, getInitials } from "@/lib/utils";
import { RANK_COLORS } from "@/lib/constants";
import type { TeamMember } from "@/lib/types";

export default function UplinePage() {
  const { data: me } = useMyDistributor();
  const distributorId = me?.id;
  const { data: upline, isLoading } = useAPI<TeamMember[]>(
    distributorId ? `/distributors/${distributorId}/upline` : null
  );

  // Upline comes as root → ... → direct sponsor; reverse so direct sponsor is at bottom
  const chain = [...(upline || [])].reverse();

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
        <h1 className="text-2xl font-bold text-foreground">Upline Chain</h1>
        <p className="mt-1 text-muted">
          Your sponsor chain from the top of the network to you.
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : chain.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            }
            title="No upline data"
            description="Your sponsor chain will appear here."
          />
        ) : (
          <div className="relative">
            {chain.map((member, index) => {
              const rankColor = RANK_COLORS[member.rank] || "#6b7280";
              const isLast = index === chain.length - 1;

              return (
                <div key={member.id} className="relative flex items-start gap-4">
                  {/* Vertical line connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: rankColor }}
                    >
                      {getInitials(member.name)}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-border min-h-[2rem]" />
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{member.name}</span>
                      <Badge variant="info">{member.rank}</Badge>
                      {index === 0 && (
                        <Badge variant="warning">Root</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      Code: {member.referralCode} &middot; Joined {formatDate(member.joinedAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* "You are here" indicator */}
            <div className="relative flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white flex-shrink-0">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-accent">You are here</span>
                </div>
                <p className="text-sm text-muted mt-1">
                  Your position in the network
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
