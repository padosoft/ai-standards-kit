# Enterprise Security Standards

## Security Principles

### Defense in Depth
- **Multiple security layers** - Never rely on a single security control
- **Assume breach** - Design systems assuming attackers will get in
- **Least privilege** - Grant minimum permissions necessary
- **Zero trust** - Verify everything, trust nothing
- **Fail secure** - Default to denying access when systems fail

### Security by Design
1. **Threat modeling** during design phase
2. **Security requirements** as first-class citizens
3. **Regular security reviews** and audits
4. **Penetration testing** before major releases
5. **Security training** for all developers

## Authentication Standards

### Password Requirements
```typescript
export const PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true, // No username, email parts
  preventReuse: 12, // Can't reuse last 12 passwords
  maxAge: 90, // Days before forced reset
};

// Implementation
export class PasswordValidator {
  private commonPasswords = new Set(loadCommonPasswords());
  
  validate(password: string, user: User): ValidationResult {
    const errors: string[] = [];
    
    if (password.length < PasswordPolicy.minLength) {
      errors.push(`Password must be at least ${PasswordPolicy.minLength} characters`);
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    }
    
    if (this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    if (this.containsUserInfo(password, user)) {
      errors.push('Password cannot contain personal information');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### Multi-Factor Authentication (MFA)
```typescript
export interface MFAProvider {
  generateSecret(): string;
  generateQRCode(secret: string, user: User): string;
  verifyToken(secret: string, token: string): boolean;
}

export class TOTPProvider implements MFAProvider {
  generateSecret(): string {
    return speakeasy.generateSecret({ length: 32 }).base32;
  }
  
  generateQRCode(secret: string, user: User): string {
    const otpauth = speakeasy.otpauthURL({
      secret,
      label: user.email,
      issuer: 'YourCompany',
      encoding: 'base32'
    });
    return qrcode.toDataURL(otpauth);
  }
  
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps for clock skew
    });
  }
}

// Backup codes for MFA recovery
export class BackupCodeGenerator {
  generate(count: number = 10): string[] {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
  
  hash(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code + process.env.BACKUP_CODE_SALT)
      .digest('hex');
  }
}
```

### Session Management
```typescript
export const SessionConfig = {
  duration: 30 * 60 * 1000, // 30 minutes
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
  slidingExpiration: true,
  regenerateOnPrivilegeEscalation: true,
  secureCookie: true,
  httpOnlyCookie: true,
  sameSiteCookie: 'strict' as const,
};

export class SessionManager {
  async createSession(user: User, request: Request): Promise<Session> {
    const session = {
      id: this.generateSecureId(),
      userId: user.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      fingerprint: this.generateFingerprint(request),
    };
    
    await this.store.save(session);
    
    // Invalidate other sessions if needed
    if (user.settings.singleSession) {
      await this.invalidateOtherSessions(user.id, session.id);
    }
    
    return session;
  }
  
  async validateSession(sessionId: string, request: Request): Promise<boolean> {
    const session = await this.store.get(sessionId);
    
    if (!session) return false;
    
    // Check absolute timeout
    if (Date.now() - session.createdAt.getTime() > SessionConfig.absoluteTimeout) {
      await this.invalidateSession(sessionId);
      return false;
    }
    
    // Check idle timeout
    if (Date.now() - session.lastActivity.getTime() > SessionConfig.duration) {
      await this.invalidateSession(sessionId);
      return false;
    }
    
    // Verify fingerprint hasn't changed
    if (session.fingerprint !== this.generateFingerprint(request)) {
      await this.invalidateSession(sessionId);
      this.alertSecurityTeam('Session hijacking attempt detected', session);
      return false;
    }
    
    // Update last activity
    if (SessionConfig.slidingExpiration) {
      session.lastActivity = new Date();
      await this.store.save(session);
    }
    
    return true;
  }
}
```

## Authorization Standards

### Role-Based Access Control (RBAC)
```typescript
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[]; // Other role names
}

export class RBACAuthorizer {
  constructor(private roleRepository: RoleRepository) {}
  
  async canPerform(
    user: User,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(user);
    const permissions = await this.getPermissionsForRoles(userRoles);
    
    for (const permission of permissions) {
      if (this.matchesPermission(permission, resource, action, context)) {
        return true;
      }
    }
    
    return false;
  }
  
  private matchesPermission(
    permission: Permission,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check resource and action match (with wildcards)
    if (!this.matchesPattern(permission.resource, resource)) return false;
    if (!this.matchesPattern(permission.action, action)) return false;
    
    // Check conditions if present
    if (permission.conditions) {
      return this.evaluateConditions(permission.conditions, context);
    }
    
    return true;
  }
  
  private matchesPattern(pattern: string, value: string): boolean {
    if (pattern === '*') return true;
    if (pattern === value) return true;
    
    // Handle wildcards like "products:*" matching "products:read"
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(value);
  }
}
```

### Attribute-Based Access Control (ABAC)
```typescript
export interface Policy {
  effect: 'allow' | 'deny';
  subjects: AttributeCondition[];
  resources: AttributeCondition[];
  actions: string[];
  conditions?: EnvironmentCondition[];
}

export class ABACAuthorizer {
  async authorize(
    subject: Subject,
    resource: Resource,
    action: string,
    environment: Environment
  ): Promise<boolean> {
    const applicablePolicies = await this.findApplicablePolicies(
      subject,
      resource,
      action,
      environment
    );
    
    // Explicit deny takes precedence
    for (const policy of applicablePolicies) {
      if (policy.effect === 'deny') {
        return false;
      }
    }
    
    // At least one allow required
    return applicablePolicies.some(p => p.effect === 'allow');
  }
}
```

## Input Validation

### Validation Rules
```typescript
import { z } from 'zod';

// Input sanitization helpers
export const Sanitizers = {
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  },
  
  sql: (input: string): string => {
    // Never use string concatenation for SQL!
    // This is just for display purposes
    return input.replace(/['";\\]/g, '');
  },
  
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '_');
  },
  
  email: (input: string): string => {
    return input.toLowerCase().trim();
  }
};

// Validation schemas
export const UserInputSchema = z.object({
  email: z.string()
    .email()
    .transform(Sanitizers.email)
    .refine(email => !email.includes('+'), 'Plus addressing not allowed'),
  
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters in username'),
  
  bio: z.string()
    .max(500)
    .transform(Sanitizers.html)
    .optional(),
  
  age: z.number()
    .int()
    .min(13, 'Must be at least 13 years old')
    .max(120),
  
  website: z.string()
    .url()
    .refine(url => {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    }, 'Only HTTP(S) URLs allowed')
    .optional(),
});

// File upload validation
export class FileUploadValidator {
  private readonly ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ]);
  
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  validate(file: Express.Multer.File): ValidationResult {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > this.MAX_SIZE) {
      errors.push(`File size exceeds ${this.MAX_SIZE / 1024 / 1024}MB`);
    }
    
    // Check MIME type
    if (!this.ALLOWED_TYPES.has(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }
    
    // Verify actual file content matches MIME type
    const actualType = await this.detectFileType(file.buffer);
    if (actualType !== file.mimetype) {
      errors.push('File content does not match declared type');
    }
    
    // Check for malicious content
    if (await this.scanForMalware(file.buffer)) {
      errors.push('File contains malicious content');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

## SQL Injection Prevention

### Parameterized Queries
```typescript
// ✅ Good - Parameterized queries
export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }
  
  async search(filters: UserFilters): Promise<User[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (filters.name) {
      conditions.push(`name ILIKE $${paramCount}`);
      values.push(`%${filters.name}%`);
      paramCount++;
    }
    
    if (filters.age) {
      conditions.push(`age >= $${paramCount}`);
      values.push(filters.age);
      paramCount++;
    }
    
    const query = `
      SELECT * FROM users
      ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const result = await this.db.query(query, values);
    return result.rows;
  }
}

// ❌ Bad - String concatenation
export class BadUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // NEVER DO THIS!
    const result = await this.db.query(
      `SELECT * FROM users WHERE email = '${email}'`
    );
    return result.rows[0];
  }
}
```

### ORM Security
```typescript
// Using TypeORM with proper escaping
export class ProductRepository {
  async searchProducts(searchTerm: string): Promise<Product[]> {
    return await this.repository
      .createQueryBuilder('product')
      .where('product.name ILIKE :search', { search: `%${searchTerm}%` })
      .orWhere('product.description ILIKE :search', { search: `%${searchTerm}%` })
      .limit(50)
      .getMany();
  }
  
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    // TypeORM handles array parameters safely
    return await this.repository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .getMany();
  }
}
```

## Cross-Site Scripting (XSS) Prevention

### Output Encoding
```typescript
export class HTMLEncoder {
  static encode(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, char => map[char]);
  }
  
  static encodeJS(input: string): string {
    return JSON.stringify(input).slice(1, -1);
  }
  
  static encodeURL(input: string): string {
    return encodeURIComponent(input);
  }
  
  static encodeCSS(input: string): string {
    return input.replace(/[^\w]/g, char => 
      '\\' + char.charCodeAt(0).toString(16).padStart(6, '0')
    );
  }
}

// React component with XSS protection
export const SafeUserContent: React.FC<{ content: string }> = ({ content }) => {
  // React automatically escapes content
  return <div>{content}</div>;
  
  // For HTML content, use DOMPurify
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

### Content Security Policy (CSP)
```typescript
export const CSPMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://trusted-cdn.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
};
```

## Cross-Site Request Forgery (CSRF) Prevention

### CSRF Tokens
```typescript
export class CSRFProtection {
  private readonly TOKEN_LENGTH = 32;
  
  generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }
  
  storeToken(session: Session, token: string): void {
    session.csrfToken = this.hashToken(token);
    session.csrfTokenExpiry = Date.now() + 3600000; // 1 hour
  }
  
  validateToken(session: Session, token: string): boolean {
    if (!session.csrfToken || !token) return false;
    if (Date.now() > session.csrfTokenExpiry) return false;
    
    return crypto.timingSafeEqual(
      Buffer.from(session.csrfToken),
      Buffer.from(this.hashToken(token))
    );
  }
  
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token + process.env.CSRF_SECRET)
      .digest('hex');
  }
}

// Double Submit Cookie Pattern
export const DoubleSubmitCSRF = {
  middleware: (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];
    
    if (!cookieToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    next();
  },
  
  generateToken: (res: Response) => {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: true,
      sameSite: 'strict'
    });
    return token;
  }
};
```

## API Security

### Rate Limiting
```typescript
export class RateLimiter {
  constructor(
    private store: RateLimitStore,
    private config: RateLimitConfig
  ) {}
  
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = this.config.windowMs;
    
    // Get current count
    const count = await this.store.increment(key, window);
    
    if (count > this.config.max) {
      const resetTime = now + window;
      return {
        allowed: false,
        limit: this.config.max,
        remaining: 0,
        resetTime
      };
    }
    
    return {
      allowed: true,
      limit: this.config.max,
      remaining: this.config.max - count,
      resetTime: now + window
    };
  }
}

// API Key Authentication
export class APIKeyAuth {
  async validateAPIKey(key: string): Promise<APIKeyValidation> {
    const hashedKey = this.hashKey(key);
    const apiKey = await this.repository.findByHash(hashedKey);
    
    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }
    
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, reason: 'API key expired' };
    }
    
    if (apiKey.revokedAt) {
      return { valid: false, reason: 'API key revoked' };
    }
    
    // Check rate limits for this key
    const rateLimitResult = await this.rateLimiter.checkLimit(apiKey.id);
    if (!rateLimitResult.allowed) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }
    
    // Log usage
    await this.logUsage(apiKey.id);
    
    return { valid: true, apiKey };
  }
  
  private hashKey(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }
}
```

## Secrets Management

### Environment Variables
```typescript
export class ConfigValidator {
  private requiredSecrets = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'API_KEY',
    'SMTP_PASSWORD'
  ];
  
  validateSecrets(): void {
    const missing: string[] = [];
    
    for (const secret of this.requiredSecrets) {
      if (!process.env[secret]) {
        missing.push(secret);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.join(', ')}`);
    }
    
    // Check secret strength
    this.validateSecretStrength();
  }
  
  private validateSecretStrength(): void {
    // JWT Secret should be at least 256 bits
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET too weak, must be at least 32 characters');
    }
    
    // Encryption key should be exactly 32 bytes for AES-256
    if (process.env.ENCRYPTION_KEY && 
        Buffer.from(process.env.ENCRYPTION_KEY, 'hex').length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
  }
}

// Secrets rotation
export class SecretsRotation {
  async rotateSecret(secretName: string): Promise<void> {
    // Generate new secret
    const newSecret = this.generateSecret(secretName);
    
    // Store with version
    await this.secretsManager.store(`${secretName}_NEW`, newSecret);
    
    // Keep old secret for grace period
    const currentSecret = await this.secretsManager.get(secretName);
    await this.secretsManager.store(`${secretName}_OLD`, currentSecret);
    
    // Update current
    await this.secretsManager.store(secretName, newSecret);
    
    // Schedule old secret deletion
    await this.scheduler.schedule(
      `delete_old_secret_${secretName}`,
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      () => this.secretsManager.delete(`${secretName}_OLD`)
    );
  }
}
```

## Encryption Standards

### Data Encryption
```typescript
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private saltLength = 64;
  
  constructor(private masterKey: string) {}
  
  encrypt(plaintext: string, associatedData?: string): EncryptedData {
    const iv = crypto.randomBytes(this.ivLength);
    const salt = crypto.randomBytes(this.saltLength);
    
    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      100000,
      this.keyLength,
      'sha256'
    );
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    if (associatedData) {
      cipher.setAAD(Buffer.from(associatedData));
    }
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: this.algorithm
    };
  }
  
  decrypt(data: EncryptedData, associatedData?: string): string {
    const key = crypto.pbkdf2Sync(
      this.masterKey,
      Buffer.from(data.salt, 'base64'),
      100000,
      this.keyLength,
      'sha256'
    );
    
    const decipher = crypto.createDecipheriv(
      data.algorithm,
      key,
      Buffer.from(data.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    
    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData));
    }
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
}

// Field-level encryption for PII
export class FieldEncryption {
  encryptPII<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const encrypted = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (data[field]) {
        encrypted[field] = this.encryptionService.encrypt(
          String(data[field])
        );
      }
    }
    
    return encrypted;
  }
}
```

## Security Headers

### HTTP Security Headers
```typescript
export const SecurityHeaders = {
  middleware: (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Force HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Prevent referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
    
    // Remove fingerprinting headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
  }
};
```

## Logging & Monitoring

### Security Logging
```typescript
export class SecurityLogger {
  private sensitivePatterns = [
    /password["\s]*[:=]["\s]*["']?[^"',}\s]+/gi,
    /api[_-]?key["\s]*[:=]["\s]*["']?[^"',}\s]+/gi,
    /token["\s]*[:=]["\s]*["']?[^"',}\s]+/gi,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  ];
  
  log(level: LogLevel, message: string, context?: any): void {
    const sanitizedMessage = this.sanitize(message);
    const sanitizedContext = this.sanitizeObject(context);
    
    this.logger.log({
      level,
      message: sanitizedMessage,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
      correlationId: this.getCorrelationId(),
    });
  }
  
  private sanitize(text: string): string {
    let sanitized = text;
    
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    return sanitized;
  }
  
  private sanitizeObject(obj: any): any {
    if (!obj) return obj;
    
    const sanitized = JSON.parse(JSON.stringify(obj));
    
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    
    const sanitizeRecursive = (current: any) => {
      if (typeof current !== 'object' || current === null) return;
      
      for (const key in current) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          current[key] = '[REDACTED]';
        } else if (typeof current[key] === 'object') {
          sanitizeRecursive(current[key]);
        } else if (typeof current[key] === 'string') {
          current[key] = this.sanitize(current[key]);
        }
      }
    };
    
    sanitizeRecursive(sanitized);
    return sanitized;
  }
}

// Security event monitoring
export class SecurityMonitor {
  async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.store.save({
      ...event,
      timestamp: new Date(),
      id: uuid(),
    });
    
    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertingService.sendAlert({
        type: 'security',
        severity: 'critical',
        message: event.description,
        details: event,
      });
    }
    
    // Check for patterns
    await this.detectPatterns(event);
  }
  
  private async detectPatterns(event: SecurityEvent): Promise<void> {
    // Detect brute force attempts
    if (event.type === 'failed_login') {
      const recentFailures = await this.store.count({
        type: 'failed_login',
        userId: event.userId,
        timestamp: { $gte: new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      if (recentFailures >= 5) {
        await this.blockUser(event.userId, 'Suspected brute force attack');
      }
    }
    
    // Detect credential stuffing
    if (event.type === 'failed_login') {
      const uniqueIPs = await this.store.distinctCount('ip', {
        type: 'failed_login',
        timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
      });
      
      if (uniqueIPs > 100) {
        await this.enableCaptcha();
        await this.alertSecurityTeam('Possible credential stuffing attack');
      }
    }
  }
}
```

## Compliance Checklist

### GDPR Compliance
- [ ] Privacy by design implemented
- [ ] Data minimization enforced
- [ ] Consent management system in place
- [ ] Right to be forgotten implemented
- [ ] Data portability supported
- [ ] Breach notification process defined
- [ ] DPO appointed (if required)
- [ ] Privacy Impact Assessment completed

### PCI DSS Compliance
- [ ] Network segmentation implemented
- [ ] Cardholder data encrypted
- [ ] Access control measures in place
- [ ] Regular security testing
- [ ] Secure development practices
- [ ] Incident response plan
- [ ] Security awareness training

### SOC 2 Type II
- [ ] Security controls documented
- [ ] Availability monitoring in place
- [ ] Processing integrity verified
- [ ] Confidentiality measures implemented
- [ ] Privacy controls active
- [ ] Change management process
- [ ] Risk assessment completed
- [ ] Vendor management program