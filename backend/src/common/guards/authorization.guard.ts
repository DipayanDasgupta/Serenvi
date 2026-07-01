import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Authorization Guard
 * Ensures user is authenticated and has proper permissions
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Verify required JWT fields
    if (!user.userId || !user.distributorId || !user.email) {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}

/**
 * Owner-Only Guard
 * Ensures user can only access their own resources
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const paramId = request.params.distributorId || request.params.userId || request.params.id;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Allow access only to own resources
    if (user.distributorId !== paramId && user.userId !== paramId) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
