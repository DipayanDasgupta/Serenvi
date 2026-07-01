import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Security Audit Interceptor
 * Logs sensitive operations for security audit trail
 */
@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const method = request.method;
    const path = request.path;
    const ip = request.ip || 'unknown';

    // Log sensitive operations
    const sensitiveEndpoints = [
      '/auth/login',
      '/auth/register',
      '/wallet/withdraw',
      '/wallet/transfer',
      '/sales/create',
    ];

    const isSensitive = sensitiveEndpoints.some(endpoint => path.includes(endpoint));

    if (isSensitive || method !== 'GET') {
      this.logger.debug(
        `${method} ${path} | User: ${user?.email || 'anonymous'} | IP: ${ip}`,
      );
    }

    return next.handle().pipe(
      tap(() => {
        if (isSensitive) {
          this.logger.log(
            `✓ ${method} ${path} | User: ${user?.email || 'anonymous'} | IP: ${ip}`,
          );
        }
      }),
      catchError(error => {
        // Log security-related failures
        if (isSensitive) {
          this.logger.error(
            `✗ ${method} ${path} | User: ${user?.email || 'anonymous'} | IP: ${ip} | Error: ${error.message}`,
          );
        }
        throw error;
      }),
    );
  }
}
