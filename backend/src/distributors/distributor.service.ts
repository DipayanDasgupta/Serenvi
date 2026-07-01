import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class DistributorService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('SMTP_EMAIL'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  // Generate a unique 6-character referral code
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getProfile(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: {
        user: { select: { email: true } },
        sponsor: { select: { id: true, name: true } },
        achievements: true,
      },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Personal Sales = level1Sales (Level 1 downline only)
    const personalSalesNum = (distributor.level1Sales as Decimal).toNumber();

    // Get deeper downline sales for total calculation
    const deeperDownline = await this.prisma.mLMTreeNode.findMany({
      where: { ancestorId: distributorId, depth: { gt: 1 } },
      include: {
        descendant: { 
          select: { 
            level1Sales: true
          } 
        },
      },
    });

    const totalDeeperDownlineSales = deeperDownline.reduce((sum, node) => {
      return sum.plus(node.descendant.level1Sales as Decimal);
    }, new Decimal(0));

    const totalSalesNum = personalSalesNum + totalDeeperDownlineSales.toNumber();

    // Create a response object with all fields, converting Decimal to number
    const response: any = { ...distributor };
    response.email = distributor.user.email;
    response.personalSales = personalSalesNum;
    response.totalSales = totalSalesNum;
    response.walletBalance = (distributor.walletBalance as Decimal).toNumber();
    response.carryForwardSales = (distributor.carryForwardSales as Decimal).toNumber();
    return response;
  }

  async getProfileByReferralCode(referralCode: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { referralCode },
      include: {
        sponsor: { select: { id: true, name: true } },
        achievements: true,
      },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Personal Sales = level1Sales (Level 1 downline only)
    const personalSalesNum = (distributor.level1Sales as Decimal).toNumber();

    // Get deeper downline sales for total calculation
    const deeperDownline = await this.prisma.mLMTreeNode.findMany({
      where: { ancestorId: distributor.id, depth: { gt: 1 } },
      include: {
        descendant: { 
          select: { 
            level1Sales: true
          } 
        },
      },
    });

    const totalDeeperDownlineSales = deeperDownline.reduce((sum, node) => {
      return sum.plus(node.descendant.level1Sales as Decimal);
    }, new Decimal(0));

    const totalSalesNum = personalSalesNum + totalDeeperDownlineSales.toNumber();

    // Create a response object with all fields, converting Decimal to number
    const response: any = { ...distributor };
    response.personalSales = personalSalesNum;
    response.totalSales = totalSalesNum;
    response.walletBalance = (distributor.walletBalance as Decimal).toNumber();
    response.carryForwardSales = (distributor.carryForwardSales as Decimal).toNumber();
    return response;
  }

  async updateProfile(distributorId: string, data: any) {
    const existing = await this.prisma.distributor.findUnique({ where: { id: distributorId } });
    if (!existing) throw new BadRequestException('Distributor not found');

    // If bank details already exist, block direct changes
    const hasBankDetails = existing.bankAccount && existing.bankIFSC;
    const isTryingToChangBank = data.bankAccount || data.bankIFSC || data.bankAccountHolder;
    if (hasBankDetails && isTryingToChangBank) {
      throw new BadRequestException('Bank details are locked. Use OTP verification to change them.');
    }

    const distributor = await this.prisma.distributor.update({
      where: { id: distributorId },
      data: {
        name: data.name || undefined,
        phone: data.phone || undefined,
        bankAccount: data.bankAccount || undefined,
        bankIFSC: data.bankIFSC || undefined,
        bankAccountHolder: data.bankAccountHolder || undefined,
      },
    });

    return {
      ...distributor,
      totalSales: distributor.totalSales.toNumber(),
      walletBalance: distributor.walletBalance.toNumber(),
    };
  }

  // Send OTP to email for bank detail changes
  async sendBankChangeOtp(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });
    if (!distributor) throw new BadRequestException('Distributor not found');

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.distributor.update({
      where: { id: distributorId },
      data: { bankOtp: hashedOtp, bankOtpExpiry: expiry },
    });

    await this.transporter.sendMail({
      from: `"SERENVI" <${this.configService.get('SMTP_EMAIL')}>`,
      to: distributor.user.email,
      subject: 'SERENVI - Bank Details Change OTP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:30px;background:#0f172a;border-radius:16px;border:1px solid #0e7490">
          <h2 style="color:#22d3ee;text-align:center;margin-bottom:20px">Bank Details Change</h2>
          <p style="color:#94a3b8;text-align:center">Use this OTP to update your bank details:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#22d3ee;background:#1e293b;padding:16px 32px;border-radius:12px;border:1px solid #0e7490;display:inline-block">${otp}</span>
          </div>
          <p style="color:#64748b;text-align:center;font-size:13px">This OTP expires in 10 minutes. If you did not request this, please ignore.</p>
        </div>
      `,
    });

    return { message: 'OTP sent to your registered email' };
  }

  // Verify OTP and update bank details
  async updateBankWithOtp(distributorId: string, otp: string, bankAccount: string, bankIFSC: string, bankAccountHolder: string) {
    const distributor = await this.prisma.distributor.findUnique({ where: { id: distributorId } });
    if (!distributor) throw new BadRequestException('Distributor not found');

    if (!distributor.bankOtp || !distributor.bankOtpExpiry) {
      throw new BadRequestException('No OTP requested. Please request an OTP first.');
    }

    if (new Date() > distributor.bankOtpExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const isValid = await bcrypt.compare(otp, distributor.bankOtp);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }

    const updated = await this.prisma.distributor.update({
      where: { id: distributorId },
      data: {
        bankAccount,
        bankIFSC,
        bankAccountHolder,
        bankOtp: null,
        bankOtpExpiry: null,
      },
    });

    return {
      message: 'Bank details updated successfully',
      bankAccount: updated.bankAccount,
      bankIFSC: updated.bankIFSC,
      bankAccountHolder: updated.bankAccountHolder,
    };
  }

  async regenerateReferralCode(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Generate new unique referral code
    let newCode = this.generateReferralCode();
    while (await this.prisma.distributor.findUnique({ where: { referralCode: newCode } })) {
      newCode = this.generateReferralCode();
    }

    const updated = await this.prisma.distributor.update({
      where: { id: distributorId },
      data: { referralCode: newCode },
    });

    return {
      referralCode: updated.referralCode,
      message: 'Referral code regenerated successfully',
    };
  }

  async getDashboard(distributorId: string) {
    try {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: distributorId },
      });

      if (!distributor) {
        throw new BadRequestException('Distributor not found');
      }

      // Get all downline members
      const downlineMembers = await this.prisma.mLMTreeNode.findMany({
        where: { ancestorId: distributorId, depth: { gt: 0 } },
        include: {
          descendant: { 
            select: { 
              level1Sales: true // Personal sales from each downline member's downline
            } 
          },
        },
      });

      // Separate Level 1 and deeper downline
      const level1Members = downlineMembers.filter(m => m.depth === 1);
      const deeperDownline = downlineMembers.filter(m => m.depth > 1);

      // Personal Sales = Only from Level 1 downline (direct downline)
      const personalSalesNum = (distributor.level1Sales as Decimal).toNumber();
      
      // Total Sales = Personal Sales + Deeper downline sales
      const totalDeeperDownlineSales = deeperDownline.reduce((sum, node) => {
        return sum.plus(node.descendant.level1Sales as Decimal);
      }, new Decimal(0));
      
      const totalSalesNum = personalSalesNum + totalDeeperDownlineSales.toNumber();

      // Get stats
      const [totalCommissionEarned, achievements] = await Promise.all([
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { distributorId },
        }),
        this.prisma.achievement.findMany({
          where: { distributorId },
          orderBy: { claimedAt: 'desc' },
        }),
      ]);

      // Get multi-level commission breakdown by level
      const commissionsByLevel = await this.prisma.commission.findMany({
        where: { distributorId },
        select: { level: true, commissionAmount: true },
      });

      const multiLevelBreakdown = commissionsByLevel.reduce((acc: Record<string, any>, c: any) => {
        const key = `level_${c.level}`;
        if (!acc[key]) {
          acc[key] = new Decimal(0);
        }
        acc[key] = (acc[key] as Decimal).plus(c.commissionAmount);
        return acc;
      }, {} as Record<string, Decimal>);

      // Get achievement progress for next rank (based on Personal Sales = level1Sales)
      const achievementMilestones = [
        { rank: 'Influencer', salesTarget: 50000, reward: 5000 },
        { rank: 'Master', salesTarget: 100000, reward: 5000 },
        { rank: 'Legend', salesTarget: 250000, reward: 15000 },
        { rank: 'Icon', salesTarget: 500000, reward: 25000 },
        { rank: 'Titan', salesTarget: 1000000, reward: 50000 },
        { rank: 'Global Leader', salesTarget: 2500000, reward: 150000 },
        { rank: 'World Leader', salesTarget: 5000000, reward: 250000 },
        { rank: 'Empire Leader', salesTarget: 10000000, reward: 500000 },
        { rank: 'Global Icon', salesTarget: 50000000, reward: 6500000 },
      ];

      const claimedRankNames = new Set(achievements.map((a: any) => a.rankName));
      const nextRank = achievementMilestones.find(m => !claimedRankNames.has(m.rank));
      
      let progressToNextRank = 100;
      if (nextRank) {
        // Progress based on Personal Sales (level1Sales)
        progressToNextRank = Math.round((personalSalesNum / nextRank.salesTarget) * 100);
      }

      return {
        name: distributor.name,
        rank: distributor.rank,
        personalSales: personalSalesNum, // Level 1 downline sales
        totalSales: totalSalesNum, // Personal + deeper downline
        walletBalance: (distributor.walletBalance as Decimal).toNumber(),
        monthlySales: (distributor.monthlySales as Decimal).toNumber(), // Monthly downline sales (resets 1st of month)
        totalCommissionEarned: totalCommissionEarned._sum.commissionAmount?.toNumber() || 0,
        currentLeadershipSalary: (distributor.currentLeadershipSalary as Decimal).toNumber(), // Pending - credited at 23:59 on last day of month
        leadershipSalaryStatus: 'PENDING', // Will be credited at 23:59 on last day of month
        leadershipSalaryNote: 'Credited at 23:59 on the last day of month',
        multiLevelCommissionBreakdown: Object.entries(multiLevelBreakdown).map(([level, amount]) => ({
          level: level.replace('level_', ''),
          amount: (amount as Decimal).toNumber(),
        })),
        achievementsUnlocked: achievements.length,
        unlockedRanks: achievements.map((a: any) => ({
          rank: a.rankName,
          reward: (a.rewardAmount as Decimal).toNumber(),
          unlockedAt: a.claimedAt,
        })),
        nextRank: nextRank ? {
          rank: nextRank.rank,
          target: nextRank.salesTarget,
          reward: nextRank.reward,
          progress: progressToNextRank,
        } : null,
        downlineCount: level1Members.length,
      };
    } catch (error: any) {
      console.error('[DASHBOARD]', error);
      throw error;
    }
  }

  async getTeamAnalytics(distributorId: string) {
    const downline = await this.prisma.mLMTreeNode.findMany({
      where: { ancestorId: distributorId },
      include: {
        descendant: { select: { id: true, name: true, totalSales: true, rank: true } },
      },
    });

    const directDownline = downline.filter((d: any) => d.depth === 1);

    return {
      teamSize: downline.length,
      directDownline: directDownline.length,
      members: directDownline.map((d: any) => ({
        id: d.descendant.id,
        name: d.descendant.name,
        rank: d.descendant.rank,
        sales: d.descendant.totalSales.toNumber(),
      })),
    };
  }

  /**
   * Get detailed team sales breakdown by level (Max 15 levels)
   */
  async getTeamSalesByLevel(distributorId: string) {
    const levelData = [];

    // Get downline by depth (level)
    for (let depth = 1; depth <= 15; depth++) {
      const members = await this.prisma.mLMTreeNode.findMany({
        where: {
          ancestorId: distributorId,
          depth,
        },
        include: {
          descendant: { 
            select: { 
              id: true, 
              name: true, 
              totalSales: true,
              referralCode: true,
            },
          },
        },
      });

      if (members.length === 0) continue;

      // Get total sales for this level
      const levelTotalSales = members.reduce((sum: Decimal, m: any) => 
        sum.plus(m.descendant.totalSales), 
        new Decimal(0)
      );

      // Get individual member details with their sales
      const memberDetails = members.map((m: any) => ({
        id: m.descendant.id,
        name: m.descendant.name,
        referralCode: m.descendant.referralCode,
        sales: m.descendant.totalSales.toNumber(),
      }));

      levelData.push({
        level: depth,
        memberCount: members.length,
        totalSales: levelTotalSales.toNumber(),
        members: memberDetails,
      });
    }

    return levelData;
  }

  /**
   * Get member's purchase history (for team sales detailed view)
   */
  async getMemberSalesHistory(sellerId: string, skip: number = 0, take: number = 50) {
    const sales = await this.prisma.sale.findMany({
      where: { sellerId },
      include: {
        product: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.sale.count({ where: { sellerId } });

    const seller = await this.prisma.distributor.findUnique({
      where: { id: sellerId },
      select: { name: true, referralCode: true },
    });

    return {
      seller: {
        id: sellerId,
        name: seller?.name,
        referralCode: seller?.referralCode,
      },
      sales: sales.map((s: any) => ({
        id: s.id,
        product: s.product.name,
        quantity: s.quantity,
        amount: s.saleAmount.toNumber(),
        date: s.createdAt,
      })),
      total,
      skip,
      take,
    };
  }

  async getUpline(distributorId: string, depth: number = 15) {
    const ancestors = await this.prisma.mLMTreeNode.findMany({
      where: { descendantId: distributorId, depth: { lte: depth } },
      include: { ancestor: { select: { id: true, name: true, rank: true } } },
      orderBy: { depth: 'asc' },
    });

    return ancestors.map((a: any) => ({
      level: a.depth,
      ...a.ancestor,
    }));
  }

  async getDownline(distributorId: string, depth: number = 1) {
    const descendants = await this.prisma.mLMTreeNode.findMany({
      where: {
        ancestorId: distributorId,
        depth: { lte: depth },
      },
      include: { descendant: { select: { id: true, name: true, rank: true, totalSales: true } } },
    });

    return descendants.map((d: any) => ({
      level: d.depth,
      ...d.descendant,
      totalSales: d.descendant.totalSales.toNumber(),
    }));
  }
}
