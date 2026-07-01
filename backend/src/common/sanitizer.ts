/**
 * Input Sanitization Utility
 * Prevents injection attacks and XSS vulnerabilities
 */

export class InputSanitizer {
  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/[^a-z0-9@._-]/gi, '');
  }

  /**
   * Sanitize names and text fields
   */
  static sanitizeName(name: string): string {
    return name.trim().replace(/[^a-zA-Z\s'-]/g, '').substring(0, 100);
  }

  /**
   * Sanitize phone numbers - keep only digits
   */
  static sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '').substring(0, 15);
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(value: any): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  /**
   * Prevent SQL/NoSQL injection by checking for suspicious patterns
   */
  static detectInjectionAttempt(input: string): boolean {
    const suspiciousPatterns = [
      /(\$where|\$regex|\$ne|\$gt|\$lt|\$or|\$and|;|\\\\x|\\\\u)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /<script|javascript:|on\w+\s*=/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize UUID to prevent bypass
   */
  static sanitizeUUID(uuid: string): string {
    return uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
      ? uuid 
      : '';
  }
}
