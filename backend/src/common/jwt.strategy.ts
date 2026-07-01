import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  userId: string;
  distributorId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('JWT_SECRET') || 'serenvi-default-secret-key-2024';
    if (!secret) {
      throw new Error('JWT_SECRET must be set in environment');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.userId || !payload.distributorId || !payload.email) {
      throw new UnauthorizedException('Invalid token structure');
    }
    return { userId: payload.userId, distributorId: payload.distributorId, email: payload.email, isAdmin: payload.isAdmin || false };
  }
}
