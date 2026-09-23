import { Controller, Get, Put, Param, Body, UseGuards, Query, Post, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DistributorService } from './distributor.service';
import { UpdateDistributorDto, AttachSponsorDto } from '../common/dtos';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; distributorId: string; email: string; isAdmin: boolean };
}

@Controller('distributors')
@UseGuards(AuthGuard('jwt'))
export class DistributorController {
  constructor(private distributorService: DistributorService) {}

  // More specific routes MUST come first before generic :id routes
  @Get('profile/referral/:referralCode')
  async getProfileByReferralCode(@Param('referralCode') referralCode: string) {
    return this.distributorService.getProfileByReferralCode(referralCode);
  }

  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.distributorService.getProfile(req.user?.distributorId || '');
  }

  @Post('me/sponsor')
  async attachSponsor(@Request() req: AuthenticatedRequest, @Body() dto: AttachSponsorDto) {
    return this.distributorService.setSponsor(req.user?.distributorId || '', dto.referralCode);
  }

  @Get(':id')
  async getProfile(@Param('id') distributorId: string) {
    return this.distributorService.getProfile(distributorId);
  }

  @Put(':id')
  async updateProfile(
    @Param('id') distributorId: string,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributorService.updateProfile(distributorId, dto);
  }

  @Get(':id/dashboard')
  async getDashboard(@Param('id') distributorId: string) {
    return this.distributorService.getDashboard(distributorId);
  }

  @Get(':id/reports')
  async getReports(@Param('id') distributorId: string) {
    return this.distributorService.getReports(distributorId);
  }

  @Get(':id/team')
  async getTeam(@Param('id') distributorId: string) {
    return this.distributorService.getTeamAnalytics(distributorId);
  }

  @Get(':id/team-sales-by-level')
  async getTeamSalesByLevel(@Param('id') distributorId: string) {
    return this.distributorService.getTeamSalesByLevel(distributorId);
  }

  @Get(':id/member/:memberId/sales')
  async getMemberSalesHistory(
    @Param('id') distributorId: string,
    @Param('memberId') memberId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.distributorService.getMemberSalesHistory(memberId, parseInt(skip), parseInt(take));
  }

  @Get(':id/achievements')
  async getAchievements(@Param('id') distributorId: string) {
    return this.distributorService.getProfile(distributorId);
  }

  @Get(':id/upline')
  async getUpline(
    @Param('id') distributorId: string,
    @Query('depth') depth: string = '15',
  ) {
    return this.distributorService.getUpline(distributorId, parseInt(depth));
  }

  @Get(':id/downline')
  async getDownline(
    @Param('id') distributorId: string,
    @Query('depth') depth: string = '1',
  ) {
    return this.distributorService.getDownline(distributorId, parseInt(depth));
  }

  @Post(':id/regenerate-referral-code')
  async regenerateReferralCode(@Param('id') distributorId: string) {
    return this.distributorService.regenerateReferralCode(distributorId);
  }

  @Post(':id/bank/send-otp')
  async sendBankChangeOtp(@Param('id') distributorId: string) {
    return this.distributorService.sendBankChangeOtp(distributorId);
  }

  @Post(':id/bank/update')
  async updateBankWithOtp(
    @Param('id') distributorId: string,
    @Body() body: { otp: string; bankAccount: string; bankIFSC: string; bankAccountHolder: string },
  ) {
    return this.distributorService.updateBankWithOtp(
      distributorId,
      body.otp,
      body.bankAccount,
      body.bankIFSC,
      body.bankAccountHolder,
    );
  }
}
