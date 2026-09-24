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
  sellerId: string;
  distributorId?: string;
  productId: string;
  quantity: number;
  amount: number;
  saleAmount: number;
  paymentMethod: string;
  status: OrderStatus;
  orderStatus?: OrderStatus;
  product?: Product;
  createdAt: string;
}

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

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
  id?: string;
  distributorId?: string;
  type:
    | "MLM_COMMISSION"
    | "ACHIEVEMENT_REWARD"
    | "LEADERSHIP_SALARY"
    | "PRODUCT_PURCHASE"
    | "PURCHASE"
    | "WITHDRAWAL"
    | "DEPOSIT"
    | "WALLET_TRANSFER_IN"
    | "WALLET_TRANSFER_OUT"
    | "TRANSFER"
    | "COMMISSION"
    | "ACHIEVEMENT"
    | "SALARY"
    | "REFUND";
  amount: number;
  description: string;
  referenceId?: string;
  /** The ledger exposes `date`; older shapes used `createdAt`. */
  date?: string;
  createdAt?: string;
  status?: string;
}

export interface DepositRequest {
  id: string;
  distributorId: string;
  amount: number;
  paymentMethod: string;
  status: "PENDING" | "COMPLETED" | "REJECTED" | "FAILED";
  transactionId?: string;
  notes?: string;
  createdAt: string;
  distributor?: { id: string; name: string; email: string; referralCode: string };
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
  id?: string;
  distributorId?: string;
  rankName: string;
  /** Some responses label the rank `rank` instead. */
  rank?: string;
  targetAmount: number;
  salesTarget?: number;
  rewardAmount: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  claimed?: boolean;
  progressPercent?: number;
  personalSalesMade?: number;
  claimedAt?: string;
  unlockedAt?: string;
}

export interface AchievementProgress {
  currentSales: number;
  /** Alias of currentSales — both names are returned by the API. */
  personalSales?: number;
  currentRank?: string;
  achievements: Achievement[];
  nextMilestone?: AchievementMilestone;
}

export interface AchievementMilestone {
  id?: string;
  rank: string;
  rankName?: string;
  salesTarget?: number;
  targetAmount: number;
  rewardAmount: number;
  personalSalesMade?: number;
  claimed: boolean;
  isClaimed: boolean;
  isUnlocked: boolean;
  progressPercent: number;
  claimedAt?: string;
  unlockedAt?: string;
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
  teamSize?: number;
  directDownline?: number;
  members?: Array<{
    id: string;
    name: string;
    rank: string;
    status?: string;
    sales?: number;
    ownSales: number;
    teamSales: number;
  }>;
}

// ====== Admin ======
export interface AdminStats {
  totalUsers: number;
  totalSales: number;
  totalOrders: number;
  totalCommissions: number;
  recentOrders: Sale[];
  depositsSummary?: { pendingCount: number; pendingAmount: number };
  recentDeposits?: DepositRequest[];
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
