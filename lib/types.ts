// ====== User & Distributor ======
export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  clerkUserId?: string;
}

export interface Distributor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  sponsorId?: string;
  rank: string;
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  totalSales: number;
  level1Sales: number;
  monthlySales: number;
  carryForwardSales: number;
  walletBalance: number;
  bankAccount?: string;
  bankIFSC?: string;
  bankAccountHolder?: string;
  tPin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributorDashboard {
  distributor: Distributor;
  teamSize: number;
  activeTeamSize: number;
  totalCommissions: number;
  monthlyCommissions: number;
  recentSales: Sale[];
  recentCommissions: Commission[];
}

// ====== Products ======
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  type: "PHYSICAL" | "DIGITAL";
  imageUrl?: string;
  stockQuantity?: number;
  gender?: string;
  sizes?: string;
  isActive: boolean;
  createdAt: string;
}

// ====== Cart ======
export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  selectedSize?: string;
  product: Product;
}

// ====== Sales ======
export interface Sale {
  id: string;
  distributorId: string;
  productId: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
  status: "COMPLETED" | "PENDING" | "REFUNDED";
  product?: Product;
  createdAt: string;
}

export interface SalesStats {
  totalSales: number;
  totalCount: number;
  monthlySales: { month: string; amount: number; count: number }[];
}

// ====== Commissions ======
export interface Commission {
  id: string;
  distributorId: string;
  saleId: string;
  level: number;
  amount: number;
  rate: number;
  createdAt: string;
}

// ====== Wallet ======
export interface WalletSummary {
  balance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
}

export interface WalletTransaction {
  id: string;
  distributorId: string;
  type: "COMMISSION" | "ACHIEVEMENT" | "SALARY" | "PURCHASE" | "WITHDRAWAL" | "DEPOSIT" | "TRANSFER" | "REFUND";
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  distributorId: string;
  amount: number;
  bankAccount: string;
  bankIFSC: string;
  accountHolder: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// ====== Achievements ======
export interface Achievement {
  id: string;
  distributorId: string;
  rankName: string;
  targetAmount: number;
  rewardAmount: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  claimedAt?: string;
  unlockedAt?: string;
}

export interface AchievementMilestone {
  rankName: string;
  targetAmount: number;
  rewardAmount: number;
}

export interface AchievementProgress {
  currentSales: number;
  achievements: Achievement[];
  nextMilestone?: AchievementMilestone;
}

// ====== Team ======
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  rank: string;
  totalSales: number;
  status: string;
  level: number;
  joinedAt: string;
  downlineCount?: number;
  children?: TeamMember[];
}

export interface TeamAnalytics {
  totalTeamSize: number;
  activeMembers: number;
  totalTeamSales: number;
  monthlyTeamSales: number;
  salesByLevel: { level: number; sales: number; members: number }[];
}

// ====== Admin ======
export interface AdminStats {
  totalUsers: number;
  totalSales: number;
  totalOrders: number;
  totalCommissions: number;
  recentOrders: Sale[];
}

// ====== Payment ======
export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// ====== API Response ======
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}
