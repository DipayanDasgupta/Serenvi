import { Injectable, BadRequestException, UnauthorizedException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
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

  /**
   * Exchange a Clerk session JWT for a backend access token.
   *
   * 1. Verifies the RS256 signature against the Clerk JWKS (never trusts the client).
   * 2. Resolves identity from token claims + Clerk Backend API (verified email only
   *    for linking; unverified emails can only create fresh, unclaimed addresses).
   * 3. Auto-provisions User + Distributor on first login, then mints our own JWT
   *    so every existing guard keeps working unchanged.
   */
  async clerkExchange(clerkToken: string, bodyEmail?: string, bodyName?: string) {
    const jwksUri = this.configService.get('CLERK_JWKS_URL');
    const issuer = this.configService.get('CLERK_JWT_ISSUER');
    const clerkSecret = this.configService.get('CLERK_SECRET_KEY');
    if (!jwksUri || !issuer) {
      throw new ServiceUnavailableException('Clerk sign-in is not configured on the server');
    }

    // --- 1. Verify signature via JWKS ---
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.decode(clerkToken, { complete: true });
      const kid = typeof decoded === 'object' && decoded?.header?.kid;
      if (!kid) throw new Error('missing kid');
      const client = jwksRsa({ jwksUri, cache: true, rateLimit: true, jwksRequestsPerMinute: 10 });
      const key = await client.getSigningKey(kid);
      payload = jwt.verify(clerkToken, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer,
      }) as jwt.JwtPayload;
    } catch (error: any) {
      throw new UnauthorizedException(`Invalid Clerk token: ${error.message}`);
    }
    const sub = typeof payload.sub === 'string' && payload.sub;
    if (!sub) throw new UnauthorizedException('Clerk token has no subject');

    // --- 2. Resolve verified email (token claim preferred, Clerk API fallback) ---
    let email = typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : '';
    let emailVerified = false;
    if (email && payload.email_verified === true) {
      emailVerified = true;
    }
    if ((!email || !emailVerified) && clerkSecret) {
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(sub)}`, {
          headers: { Authorization: `Bearer ${clerkSecret}` },
        });
        if (res.ok) {
          const u: any = await res.json();
          const addrs: any[] = Array.isArray(u.email_addresses) ? u.email_addresses : [];
          const primary = addrs.find((a) => a.id === u.primary_email_address_id) || addrs[0];
          if (primary?.email_address) {
            email = String(primary.email_address).toLowerCase().trim();
            emailVerified = primary.verification?.status === 'verified';
          }
        }
      } catch {
        // fall through to body-provided email
      }
    }
    if (!email && bodyEmail) email = bodyEmail.toLowerCase().trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('Could not determine a verified email for this Clerk account');
    }

    // --- 3. Match or provision local account ---
    let isNewDistributor = false;
    let user = await this.prisma.user.findUnique({ where: { clerkUserId: sub } });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.clerkUserId && byEmail.clerkUserId !== sub) {
          throw new UnauthorizedException('Email already linked to a different sign-in');
        }
        // Link password-era accounts only on verified emails to prevent takeover.
        if (!byEmail.clerkUserId && !emailVerified) {
          throw new UnauthorizedException('Email already registered. Verify your email with Clerk and retry.');
        }
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { clerkUserId: sub },
        });
      }
    }
    if (!user) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new UnauthorizedException('Email already registered. Sign in with your original method.');
      }
      isNewDistributor = true;
      const displayName = (bodyName || email.split('@')[0] || 'Serenvi Member').slice(0, 100);
      user = await this.prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash(crypto.randomUUID(), 12), // unusable; Clerk owns auth
          clerkUserId: sub,
        },
      });
      let referralCode = this.generateReferralCode();
      while (await this.prisma.distributor.findUnique({ where: { referralCode } })) {
        referralCode = this.generateReferralCode();
      }
      await this.prisma.distributor.create({
        data: {
          userId: user.id,
          // TODO: collect real name/phone at onboarding; Clerk SSO has neither reliably.
          name: displayName.length >= 2 ? displayName : 'Serenvi Member',
          phone: '0000000000', // placeholder; update via profile
          email,
          referralCode,
          tPin: this.generateTPIN(),
          walletBalance: new Decimal(0),
          carryForwardSales: new Decimal(0),
        },
      });
    }

    const distributor = await this.prisma.distributor.findUnique({ where: { userId: user.id } });
    if (!distributor) {
      throw new UnauthorizedException('Distributor account not found');
    }

    const token = this.generateToken(user.id, distributor.id, user.email, user.isAdmin);
    return {
      access_token: token,
      isNewDistributor,
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
  }

  private async addToMLMTree(sponsorId: string, distributorId: string) {
    // Cycle guard: the sponsor must not be the distributor itself or one of
    // its own descendants — that would loop commission payouts forever.
    if (sponsorId === distributorId) {
      throw new BadRequestException('A distributor cannot sponsor themselves');
    }
    const cycle = await this.prisma.mLMTreeNode.findFirst({
      where: { ancestorId: distributorId, descendantId: sponsorId },
      select: { id: true },
    });
    if (cycle) {
      throw new BadRequestException('This sponsorship would create a circular relationship');
    }
    // Add direct sponsorship (depth = 1)
    await this.prisma.mLMTreeNode.create({
      data: {
        ancestorId: sponsorId,
        descendantId: distributorId,
        depth: 1,
      },
    });

    // Also add all ancestors of sponsor (capped at commission depth 15)
    const sponsorAncestors = await this.prisma.mLMTreeNode.findMany({
      where: { descendantId: sponsorId },
    });

    for (const ancestor of sponsorAncestors) {
      if (ancestor.depth + 1 > 15) continue;
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
