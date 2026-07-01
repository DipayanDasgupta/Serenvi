export const ACHIEVEMENT_MILESTONES = [
  { rankName: "Influencer", targetAmount: 50000, rewardAmount: 5000 },
  { rankName: "Master", targetAmount: 100000, rewardAmount: 5000 },
  { rankName: "Legend", targetAmount: 250000, rewardAmount: 15000 },
  { rankName: "Icon", targetAmount: 500000, rewardAmount: 25000 },
  { rankName: "Titan", targetAmount: 1000000, rewardAmount: 50000 },
  { rankName: "Global Leader", targetAmount: 2500000, rewardAmount: 150000 },
  { rankName: "World Leader", targetAmount: 5000000, rewardAmount: 250000 },
  { rankName: "Empire Leader", targetAmount: 10000000, rewardAmount: 500000 },
  { rankName: "Global Icon", targetAmount: 50000000, rewardAmount: 6500000 },
] as const;

export const COMMISSION_RATES: Record<number, number> = {
  1: 25.0, 2: 7.0, 3: 4.5, 4: 2.5, 5: 2.0,
  6: 2.0, 7: 1.8, 8: 1.6, 9: 1.4, 10: 1.2,
  11: 1.0, 12: 1.0, 13: 1.0, 14: 1.0, 15: 1.0,
};

export const SALARY_TIERS = [
  { minSales: 5000000, rate: 0.8 },
  { minSales: 1000000, rate: 1.5 },
  { minSales: 500000, rate: 1.6 },
  { minSales: 250000, rate: 1.6 },
  { minSales: 50000, rate: 1.3 },
  { minSales: 25000, rate: 1.1 },
  { minSales: 10000, rate: 2.9 },
  { minSales: 5000, rate: 3.7 },
] as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Products", href: "/products", icon: "shopping-bag" },
  { label: "Cart", href: "/cart", icon: "shopping-cart" },
  { label: "Orders", href: "/orders", icon: "receipt" },
  { label: "Wallet", href: "/wallet", icon: "wallet" },
  { label: "Team", href: "/team", icon: "users" },
  { label: "Achievements", href: "/achievements", icon: "trophy" },
  { label: "Profile", href: "/profile", icon: "user" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Admin Dashboard", href: "/admin", icon: "shield" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Orders", href: "/admin/orders", icon: "receipt" },
] as const;

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  COMMISSION: "text-success",
  ACHIEVEMENT: "text-warning",
  SALARY: "text-accent-2",
  PURCHASE: "text-danger",
  WITHDRAWAL: "text-danger",
  DEPOSIT: "text-success",
  TRANSFER: "text-accent",
  REFUND: "text-muted",
};

export const RANK_COLORS: Record<string, string> = {
  Influencer: "#06b6d4",
  Master: "#3b82f6",
  Legend: "#8b5cf6",
  Icon: "#a855f7",
  Titan: "#ec4899",
  "Global Leader": "#f59e0b",
  "World Leader": "#ef4444",
  "Empire Leader": "#f97316",
  "Global Icon": "#fbbf24",
};
