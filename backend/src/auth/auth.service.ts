import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('SMTP_EMAIL') || 'theserenvicompany@gmail.com',
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  // Generate a unique 6-character referral code (uppercase letters and numbers)
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // UID is now unified with referralCode - one unique identifier per distributor

  // Generate a 4-digit transaction PIN
  private generateTPIN(): string {
    const code = Math.floor(1000 + Math.random() * 9000);
    return code.toString();
  }

  async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    sponsorId?: string,
  ) {
    // Sanitize and validate inputs
    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.replace(/[^0-9]/g, '');

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new BadRequestException('Name must be 2-100 characters');
    }

    if (!/^\d{10,15}$/.test(trimmedPhone)) {
      throw new BadRequestException('Phone must be 10-15 digits');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])/.test(password)) {
      throw new BadRequestException('Password must contain upper, lower, number, and special character');
    }

    // Validate sponsor if provided (must be 6-character referral code)
    let actualSponsorId = sponsorId;
    if (sponsorId) {
      // Sponsor must be provided as 6-character referral code
      const sponsor = await this.prisma.distributor.findUnique({
        where: { referralCode: sponsorId },
      });
      
      if (!sponsor) {
        throw new BadRequestException('Invalid referral code. Please enter a valid 6-character referral code.');
      }
      
      actualSponsorId = sponsor.id;
    }

    // Hash password with 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
      },
    });

    // Generate unique referral code (6 chars: uppercase letters + numbers)
    let referralCode = this.generateReferralCode();
    // Ensure uniqueness
    while (await this.prisma.distributor.findUnique({ where: { referralCode } })) {
      referralCode = this.generateReferralCode();
    }

    // Generate T-PIN (4 digits)
    const tPin = this.generateTPIN();

    // Create distributor with generated referral code and T-PIN
    const distributor = await this.prisma.distributor.create({
      data: {
        userId: user.id,
        name,
        email,
        phone: trimmedPhone,
        referralCode: referralCode,
        tPin: tPin,
        sponsorId: actualSponsorId || undefined,
        walletBalance: new Decimal(0),
        carryForwardSales: new Decimal(0),
      },
    });

    // Add to MLM tree if sponsor exists
    if (actualSponsorId) {
      await this.addToMLMTree(actualSponsorId, distributor.id);
    }

    // Generate JWT token
    const token = this.generateToken(user.id, distributor.id, email);

    return {
      access_token: token,
      distributor: {
        id: distributor.id,
        name,
        email,
        phone: trimmedPhone,
        rank: distributor.rank,
        referralCode: distributor.referralCode,
        tPin: distributor.tPin,
      },
    };
  }

  async login(email: string, password: string) {
    try {
      // Normalize email for case-insensitive comparison
      const normalizedEmail = email.toLowerCase().trim();

      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const distributor = await this.prisma.distributor.findUnique({
        where: { userId: user.id },
      });
      
      if (!distributor) {
        throw new UnauthorizedException('Distributor account not found');
      }
      
      const token = this.generateToken(user.id, distributor.id, normalizedEmail, user.isAdmin);

      return {
        access_token: token,
        distributor: {
          id: distributor.id,
          name: distributor.name,
          email: distributor.email,
          phone: distributor.phone,
          rank: distributor.rank,
          referralCode: distributor.referralCode,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error: any) {
      console.error('[LOGIN ERROR]', error.message);
      if (error.status === 401 || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Login failed');
    }
  }

  private generateToken(userId: string, distributorId: string, email: string, isAdmin: boolean = false) {
    return this.jwtService.sign(
      { userId, distributorId, email, isAdmin },
      { expiresIn: '24h' },
    );
  }

  private async addToMLMTree(sponsorId: string, distributorId: string) {
    // Add direct sponsorship (depth = 1)
    await this.prisma.mLMTreeNode.create({
      data: {
        ancestorId: sponsorId,
        descendantId: distributorId,
        depth: 1,
      },
    });

    // Also add all ancestors of sponsor
    const sponsorAncestors = await this.prisma.mLMTreeNode.findMany({
      where: { descendantId: sponsorId },
    });

    for (const ancestor of sponsorAncestors) {
      await this.prisma.mLMTreeNode.create({
        data: {
          ancestorId: ancestor.ancestorId,
          descendantId: distributorId,
          depth: ancestor.depth + 1,
        },
      });
    }
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: `"SERENVI" <${this.configService.get('SMTP_EMAIL') || 'theserenvicompany@gmail.com'}>`,
        to: normalizedEmail,
        subject: 'SERENVI - Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0891b2; text-align: center;">SERENVI</h2>
            <p>Hi,</p>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(to right, #06b6d4, #3b82f6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">© SERENVI MLM Platform</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${normalizedEmail}`);
    } catch (error) {
      this.logger.error('Failed to send reset email:', error);
      throw new BadRequestException('Failed to send reset email. Please try again later.');
    }

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    this.logger.log(`Password reset completed for ${user.email}`);
    return { message: 'Password reset successfully. You can now log in.' };
  }

  async validateToken(token: string) {
    try {
      return await this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
