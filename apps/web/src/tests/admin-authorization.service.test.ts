import { UserModel } from '@tdarts/core';
import {
  AdminAuthorizationService,
  ADMIN_CAPABILITIES,
  ADMIN_ROLES,
} from '@tdarts/services';

describe('AdminAuthorizationService', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('grants all capabilities to super admin via isAdmin', async () => {
    const user = await UserModel.create({
      username: 'superadmin',
      name: 'Super Admin',
      email: 'superadmin@test.local',
      isAdmin: true,
      isVerified: true,
      adminRoles: [],
    });

    await expect(
      AdminAuthorizationService.hasAdminCapability(
        String(user._id),
        ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE
      )
    ).resolves.toBe(true);
    await expect(AdminAuthorizationService.canAccessAdminShell(String(user._id))).resolves.toBe(
      true
    );
  });

  it('grants only ads capabilities to marketing role', async () => {
    const user = await UserModel.create({
      username: 'marketing1',
      name: 'Marketing User',
      email: 'marketing@test.local',
      isAdmin: false,
      isVerified: true,
      adminRoles: [ADMIN_ROLES.MARKETING],
    });

    await expect(
      AdminAuthorizationService.hasAdminCapability(
        String(user._id),
        ADMIN_CAPABILITIES.ADMIN_ADS_READ
      )
    ).resolves.toBe(true);
    await expect(
      AdminAuthorizationService.hasAdminCapability(
        String(user._id),
        ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ
      )
    ).resolves.toBe(true);
    await expect(
      AdminAuthorizationService.hasAdminCapability(
        String(user._id),
        ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE
      )
    ).resolves.toBe(false);
    await expect(AdminAuthorizationService.canAccessAdminShell(String(user._id))).resolves.toBe(
      true
    );
  });

  it('denies admin shell and capabilities for normal user', async () => {
    const user = await UserModel.create({
      username: 'plainuser',
      name: 'Plain User',
      email: 'plain@test.local',
      isAdmin: false,
      isVerified: true,
      adminRoles: [],
    });

    await expect(AdminAuthorizationService.canAccessAdminShell(String(user._id))).resolves.toBe(
      false
    );
    await expect(
      AdminAuthorizationService.hasAdminCapability(
        String(user._id),
        ADMIN_CAPABILITIES.ADMIN_ADS_READ
      )
    ).resolves.toBe(false);
  });
});

