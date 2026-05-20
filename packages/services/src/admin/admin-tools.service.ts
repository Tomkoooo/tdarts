import { AdminAuditService } from './admin-audit.service';

/** Operational admin tools — mutations log to audit; Next.js cache calls stay in server actions. */
export class AdminToolsService {
  static async logRevalidateAdminDashboard(
    actorUserId: string,
    meta: { locale: string; paths: string[] },
  ): Promise<void> {
    await AdminAuditService.logAction(actorUserId, 'tools.revalidateAdminDashboard', meta);
  }
}
