"use client";

import { useState } from "react";
import { useAPI, useAuthToken } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ACHIEVEMENT_MILESTONES, RANK_COLORS } from "@/lib/constants";
import type { AchievementProgress } from "@/lib/types";

export default function AchievementsPage() {
  const { data: progress, isLoading, mutate } = useAPI<AchievementProgress>("/achievements/progress");
  const getToken = useAuthToken();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (achievementId: string) => {
    setClaimingId(achievementId);
    try {
      const token = await getToken();
      await api.post(`/achievements/${achievementId}/claim`, {}, token);
      mutate();
    } catch {
      // Error handling
    } finally {
      setClaimingId(null);
    }
  };

  const currentSales = progress?.currentSales || 0;

  // Find current rank
  const currentRankIndex = ACHIEVEMENT_MILESTONES.findIndex(
    (m) => currentSales < m.targetAmount
  );
  const currentRank =
    currentRankIndex === 0
      ? "Starter"
      : ACHIEVEMENT_MILESTONES[Math.max(0, currentRankIndex - 1)]?.rankName || "Global Icon";

  const getAchievementStatus = (rankName: string) => {
    const achievement = progress?.achievements?.find((a) => a.rankName === rankName);
    if (achievement?.isClaimed) return "claimed";
    if (achievement?.isUnlocked) return "unlocked";
    return "locked";
  };

  const getAchievementId = (rankName: string) => {
    return progress?.achievements?.find((a) => a.rankName === rankName)?.id;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
        <p className="mt-1 text-muted">
          Track your milestones and claim rewards.
        </p>
      </div>

      {/* Current Rank */}
      <div className="glass rounded-2xl p-6 bg-gradient-to-br from-accent/5 to-accent-2/5">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ backgroundColor: RANK_COLORS[currentRank] || "#6b7280" }}
          >
            {currentRank[0]}
          </div>
          <div>
            <p className="text-sm text-muted">Current Rank</p>
            <p className="text-2xl font-bold text-foreground">{currentRank}</p>
          </div>
        </div>

        {/* Progress to next milestone */}
        {progress?.nextMilestone && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">
                Progress to {progress.nextMilestone.rankName}
              </span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(currentSales)} / {formatCurrency(progress.nextMilestone.targetAmount)}
              </span>
            </div>
            <ProgressBar
              value={(currentSales / progress.nextMilestone.targetAmount) * 100}
              color="accent"
            />
          </div>
        )}
      </div>

      {/* Milestone Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENT_MILESTONES.map((milestone) => {
          const status = getAchievementStatus(milestone.rankName);
          const achievementId = getAchievementId(milestone.rankName);
          const progressPercent = Math.min(100, (currentSales / milestone.targetAmount) * 100);
          const rankColor = RANK_COLORS[milestone.rankName] || "#6b7280";

          return (
            <div
              key={milestone.rankName}
              className={`glass rounded-2xl p-5 relative overflow-hidden transition-all ${
                status === "locked" ? "opacity-75" : ""
              }`}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: rankColor }}
              />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: rankColor }}
                  >
                    {milestone.rankName}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Target: {formatCurrency(milestone.targetAmount)}
                  </p>
                </div>
                {status === "claimed" && (
                  <Badge variant="success">Claimed</Badge>
                )}
                {status === "unlocked" && (
                  <Badge variant="warning">Unlocked</Badge>
                )}
                {status === "locked" && (
                  <Badge>Locked</Badge>
                )}
              </div>

              {/* Reward */}
              <div className="rounded-xl bg-surface-2 p-3 mb-4">
                <p className="text-xs text-muted">Reward</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(milestone.rewardAmount)}
                </p>
              </div>

              {/* Progress */}
              <ProgressBar
                value={progressPercent}
                color={status === "claimed" ? "success" : status === "unlocked" ? "warning" : "accent"}
                size="sm"
                label={`${Math.round(progressPercent)}%`}
              />

              {/* Claim Button */}
              {status === "unlocked" && achievementId && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-4"
                  isLoading={claimingId === achievementId}
                  onClick={() => handleClaim(achievementId)}
                >
                  Claim Reward
                </Button>
              )}

              {status === "claimed" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Reward Claimed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
