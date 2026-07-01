# 🎯 Leadership Salary System - Implementation Summary

## Overview
Updated leadership salary distribution system with proper rank handling, single-tier assignment, and monthly resets.

---

## Key Changes

### 1. **Pool Percentage: 10% (not 15%)**
- Leadership pool is calculated as **10% of total revenue from referred users**
- Previous: 15%
- New: 10%

### 2. **Single Highest Tier Per User**
- Each user receives salary from their **HIGHEST qualifying tier only**
- Previously: Users were accumulating salaries across all qualifying tiers
- Example:
  - User with ₹1,65,300 monthly sales qualifies for:
    - ≥₹10,000 tier (3.7%)
    - ≥₹25,000 tier (2.9%)
    - ≥₹50,000 tier (1.1%)
    - ≥₹100,000 tier (1.3%)
  - **Now receives ONLY ≥₹100,000 tier salary** (₹344.24)
  - **Previously would have received all four** (₹3,574.80)

### 3. **Rank Change Wallet Adjustment**
When a user's monthly sales cause them to move to a new tier:
1. **Old tier salary is DEDUCTED** from wallet
2. **New tier salary is ADDED** to wallet
3. No net accumulation

Example:
```
User moves from ≥₹25,000 tier (₹250) to ≥₹50,000 tier (₹350):
- Deduct: -₹250
- Add: +₹350
- Net: +₹100 change in wallet
```

### 4. **Monthly Reset (1st of each month at 00:00)**
On the 1st of every month, the system resets:
- `monthlySales` → 0
- `currentLeadershipSalary` → 0
- `currentLeadershipRank` → null

This ensures clean slate for the new month's calculations.

### 5. **Revenue Counting - Only Referred Users**
**Only users who registered WITH a referral code contribute to the pool**
- Users with `sponsorId NOT NULL` contribute their revenue
- Users with `sponsorId = NULL` (registered without referral) do NOT contribute

---

## Database Schema Changes

### Added to `Distributor` model:
```prisma
// Leadership Salary Tracking
currentLeadershipRank     Int?      @default(0) 
// Index: 0=₹10k, 1=₹25k, 2=₹50k, 3=₹100k, etc.
// Null if not qualified for any tier

currentLeadershipSalary   Decimal   @default(0) @db.Decimal(15, 2)
// Current month's salary (updated on rank change)
```

---

## Leadership Salary Tiers

| Monthly Sales | Pool % | Notes |
|---|---|---|
| ≥₹10,000,000 | 0.8% | Tier 0 |
| ≥₹5,000,000 | 1.5% | Tier 1 |
| ≥₹2,500,000 | 1.6% | Tier 2 |
| ≥₹1,000,000 | 1.6% | Tier 3 |
| ≥₹500,000 | 1.5% | Tier 4 |
| ≥₹100,000 | 1.3% | Tier 5 |
| ≥₹50,000 | 1.1% | Tier 6 |
| ≥₹25,000 | 2.9% | Tier 7 |
| ≥₹10,000 | 3.7% | Tier 8 |
| **TOTAL** | **10.0%** | |

---

## Calculation Flow

### Monthly Distribution Process:

1. **Calculate referred user revenue**
   - Query all sales from users where `seller.sponsorId NOT NULL`
   - Sum their `saleAmount` for the month

2. **Calculate pool**
   - Pool = Total Revenue × 10%

3. **Group users by highest tier**
   - For each user, find the highest tier they qualify for
   - Tier is determined by their `monthlySales`

4. **Distribute within each tier**
   - Tier Pool = Total Pool × Tier %
   - Per User Amount = Tier Pool ÷ Number of Users in Tier
   - Split equally among all users in that tier

5. **Handle rank changes**
   - If user's tier changed from previous month:
     - Deduct previous salary from wallet
     - Add new salary to wallet
   - Update `currentLeadershipRank` and `currentLeadershipSalary`

---

## Cron Jobs

### 1. Monthly Reset (1st of month at 00:00)
```
@Cron('0 0 1 * *')
resetMonthlyMetrics()
```
Resets `monthlySales`, `currentLeadershipSalary`, `currentLeadershipRank` to 0/null

### 2. Salary Distribution (1st of month at 01:00)
```
@Cron('0 1 1 * *')
distributeLeadershipSalary()
```
Runs after monthly reset, calculates and distributes salaries

---

## Testing

### Test Files Provided:

1. **test-leadership-salary.js**
   - Tests the complete salary distribution logic
   - Shows tier grouping and salary calculation

2. **test-rank-changes.js**
   - Demonstrates rank change handling
   - Shows wallet deduction/addition on tier changes

### Run Tests:
```bash
cd backend

# Clean and test salary distribution
node cleanup-full.js && node test-leadership-salary.js

# Test rank changes
node test-rank-changes.js
```

---

## Implementation Files

### Updated:
- `src/salary/salary.service.ts` - Main salary distribution logic
- `prisma/schema.prisma` - Added tracking fields
- `test-leadership-salary.js` - Updated test with new logic

### Created:
- `migrations/[timestamp]_add_leadership_salary_tracking/migration.sql` - Database migration
- `test-rank-changes.js` - Rank change demonstration

---

## Example Scenario

**Month: April 2026**
- Total Referred User Revenue: ₹2,64,800
- Leadership Pool (10%): ₹26,480

**User: Aryaman Mandal**
- Monthly Sales: ₹1,65,300
- Qualifies for: ≥₹100,000 tier (1.3%)
- Tier Salary: ₹26,480 × 1.3% ÷ 1 user = ₹344.24
- Wallet Updated: +₹344.24

---

## Wallet Transaction Tracking

All salary-related changes are logged in `walletTransaction`:

```typescript
// Main salary addition
{
  type: 'LEADERSHIP_SALARY',
  amount: ₹344.24,
  description: 'Leadership salary - Tier ≥₹100,000 (4/2026)'
}

// On rank change (if applicable)
{
  type: 'LEADERSHIP_SALARY',
  amount: -₹100,
  description: 'Rank adjustment: Removed previous tier salary (₹100)'
}
```

---

## Important Notes

1. **No Accumulation**: Users NEVER accumulate salaries across tiers
2. **Highest Tier Only**: Only the highest qualifying tier pays
3. **Clean Monthly Reset**: All metrics reset on 1st of month
4. **Referred Users Only**: Only users with `sponsorId` contribute to pool
5. **Equal Distribution Within Tiers**: If multiple users share same tier, pool is split equally
6. **Rank Change Handling**: Previous salary always deducted before new one added

---

## API Endpoints

```
GET  /api/salary/distribution     - Get tier breakdown
GET  /api/salary/summary/:userId  - Get user's salary history
POST /api/salary/test             - Manually trigger distribution (admin)
```

---

## Verification Checklist

- [x] Pool percentage is 10%
- [x] Single highest tier per user
- [x] Rank changes deduct old + add new
- [x] Monthly reset on 1st of month
- [x] Only referred users count in pool
- [x] Equal distribution in shared tiers
- [x] Transaction logging on wallet
- [x] Migrations applied
- [x] Tests passing
