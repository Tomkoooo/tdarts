import { ErrorService } from '../error.service';

/**
 * Structured admin-panel mutations for audit trails (stored in `Log` collection).
 */
export class AdminAuditService {
  static async logAction(actorUserId: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
    await ErrorService.logInfo(`admin.${action}`, 'system', {
      userId: actorUserId,
      operation: `admin.${action}`,
      metadata: metadata ?? {},
    });
  }
}
