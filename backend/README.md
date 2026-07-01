# SERENVI Backend - NestJS API

Complete MLM (Network Marketing) platform backend with 15-level commission distribution, 9-rank achievement system, and monthly leadership salary model.

## Project Structure

```
backend/
├── src/
│   ├── auth/                  # Authentication (Register/Login)
│   ├── distributors/          # Distributor profiles & team
│   ├── sales/                 # Product sales & transactions
│   ├── commission/            # 15-level MLM distribution
│   ├── achievements/          # 9-rank milestone system
│   ├── salary/                # Monthly leadership salary
│   ├── wallet/                # Wallet & withdrawals
│   ├── products/              # Product catalog
│   ├── admin/                 # Admin operations
│   ├── common/                # DTOs, Guards, Strategies
│   ├── database/              # Prisma service
│   ├── app.module.ts          # Main module
│   └── main.ts                # Bootstrap
├── prisma/
│   └── schema.prisma          # Database schema
├── .env.example               # Environment template
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## Key Features

### 1. MLM Commission (55% Total)
- **15-level pyramid structure**
- Commission rates: 25% (L1), 7% (L2), 4.5% (L3)... down to 1% (L15)
- Automatic distribution triggered on every sale
- Full audit trail in wallet transactions

### 2. Achievement System (9 Ranks)
- **Influencer**: 150K sales → ₹10K reward
- **Master**: 450K sales → ₹30K reward
- **Legend**: 1.5M sales → ₹100K reward
- **Icon**: 6M sales → ₹500K reward
- **Titan**: 30M sales → ₹2.5M reward
- **Global Leader**: 150M sales → ₹10M reward
- **World Leader**: 300M sales → ₹30M reward
- **Empire Leader**: 1.5B sales → ₹100M reward
- **Global Icon**: 3B sales → ₹250M reward
- Auto-detection & one-time reward claiming

### 3. Leadership Salary (10% Pool)
- **Monthly distribution** on 1st of month
- 10% of revenue pool allocated
- Divided by rank: Influencer (0.7%), Master (0.9%)... Global Icon (0.8%)
- Cron job automated distribution
- Equal split among members of same rank

### 4. Wallet & Transactions
- Real-time balance tracking
- 4 earning types: Commission, Achievements, Salary, Purchase
- Withdrawal requests with 2-3% fee (min ₹20)
- Transaction audit log (immutable)
- KYC verification gating

## Database Schema

### Core Models
- **User**: Authentication credentials
- **Distributor**: Profile, hierarchy, metrics
- **MLMTreeNode**: Materialized path for upline/downline lookups
- **Product**: Catalog (physical/digital)
- **Sale**: Transactions with status tracking
- **Commission**: 15-level distribution records
- **Achievement**: Milestone claims
- **LeadershipSalary**: Monthly payouts
- **WalletTransaction**: Complete audit log
- **WithdrawalRequest**: Payout management

## API Endpoints

### Authentication
- `POST /auth/register` - Register with sponsor
- `POST /auth/login` - Login & JWT token
- `POST /auth/refresh` - Refresh expired token

### Distributors
- `GET /distributors/:id` - Profile
- `PUT /distributors/:id` - Update profile
- `GET /distributors/:id/dashboard` - Dashboard stats
- `GET /distributors/:id/team` - Team analytics
- `GET /distributors/:id/achievements` - Achievement progress
- `GET /distributors/:id/upline` - Sponsor chain
- `GET /distributors/:id/downline` - Direct downline

### Sales & Products
- `POST /sales` - Create sale
- `GET /sales/history` - Sales history
- `GET /sales/stats` - Sales statistics
- `GET /products` - List products
- `POST /products` - Create product (admin)
- `GET /products/:id` - Product details

### Wallet
- `GET /wallet` - Balance & summary
- `GET /wallet/transactions` - Transaction history
- `POST /wallet/withdraw` - Request withdrawal
- `GET /admin/withdrawals` - Withdrawal requests

### Admin
- `GET /admin/distributors` - List distributors
- `GET /admin/sales/report` - Sales reports
- `GET /admin/revenue` - Revenue analytics
- `POST /admin/withdraw/approve/:id` - Approve withdrawal
- `POST /admin/withdraw/reject/:id` - Reject withdrawal
- `POST /admin/salary/distribute` - Manual salary distribution

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for enhancement)

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:push

# Start development server
npm run start:dev

# Build for production
npm run build
npm start
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/serenvi_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="24h"
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3001"
```

## Service Implementations

###  CommissionService
```typescript
// Automatically distributes to 15 levels after sale
await commissionService.distributeCommission(saleId, sellerId, saleAmount);

// Get commission summary for distributor
const summary = await commissionService.getCommissionSummary(distId);
```

### AchievementService
```typescript
// Auto-triggered after each sale
await achievementService.checkAndClaimAchievements(distId);

// Get progress towards next milestone
const progress = await achievementService.getAchievementProgress(distId);
```

### SalaryService
```typescript
// Auto-runs on 1st of month via @Cron
@Cron('0 0 1 * *')
async distributeLeadershipSalary() { ... }

// Or manually trigger
await salaryService.manualDistribution();
```

### SalesService
```typescript
// Creates sale & triggers all downstream logic:
// 1. Commission distribution
// 2. Achievement detection
// 3. Wallet logging
const sale = await salesService.createSale(sellerId, productId, qty, method);
```

## MLM Calculation Examples

### Commission on ₹10,000 Sale
```
Level 1: ₹10,000 × 25% = ₹2,500
Level 2: ₹10,000 × 7%  = ₹700
Level 3: ₹10,000 × 4.5% = ₹450
... (continues to level 15)
Total: ₹5,500 (55%) distributed to upline
```

### Withdrawal with Fee
```
Request: ₹1,000
Fee: MAX(₹1,000 × 2%, ₹20) = ₹20
Net: ₹980 credited to bank account
```

### Leadership Salary Distribution (₹1M revenue)
```
Leadership Pool: ₹1,000,000 × 10% = ₹100,000

Influencer (0.7%):   ₹700 per member
Master (0.9%):       ₹900 per member
Legend (1.1%):       ₹1,100 per member
... (continues for 9 ranks)
```

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Docker setup
- Database migration
- Environment configuration
- Monitoring & logging
- Performance optimization

## API Documentation

Full Swagger/OpenAPI docs available at `/api` after server starts.

## Support

For issues or questions:
1. Check error logs in `logs/` directory
2. Review database audit trail in `wallet_transactions` table
3. Contact: [support email]

---

**Version**: 2.0  
**Last Updated**: March 2025  
**Status**: Production Ready
