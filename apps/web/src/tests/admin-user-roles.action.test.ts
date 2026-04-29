jest.mock('@/shared/lib/guards', () => ({
  authorizeUserResult: jest.fn(),
}));

import { UserModel } from '@tdarts/core';
import { authorizeUserResult } from '@/shared/lib/guards';
import { adminUsersSetAdminRolesAction } from '@/features/admin/actions/adminDomainsServer.action';

describe('adminUsersSetAdminRolesAction', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await UserModel.deleteMany({});
  });

  it('allows global admin to set normalized marketing role', async () => {
    const admin = await UserModel.create({
      username: 'roleadmin',
      name: 'Role Admin',
      email: 'roleadmin@test.local',
      isAdmin: true,
      isVerified: true,
      adminRoles: [],
    });
    const target = await UserModel.create({
      username: 'targetuser',
      name: 'Target User',
      email: 'target@test.local',
      isAdmin: false,
      isVerified: true,
      adminRoles: [],
    });

    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: String(admin._id) },
    });

    const result = await adminUsersSetAdminRolesAction(String(target._id), [
      'MARKETING',
      'unknown-role',
    ]);

    expect(result).toMatchObject({ ok: true });
    const refreshed = await UserModel.findById(target._id).lean();
    expect(refreshed?.adminRoles).toEqual(['marketing']);
  });

  it('denies non-global-admin caller', async () => {
    const caller = await UserModel.create({
      username: 'notadmin',
      name: 'Not Admin',
      email: 'notadmin@test.local',
      isAdmin: false,
      isVerified: true,
      adminRoles: ['marketing'],
    });
    const target = await UserModel.create({
      username: 'targetuser2',
      name: 'Target User 2',
      email: 'target2@test.local',
      isAdmin: false,
      isVerified: true,
      adminRoles: [],
    });

    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: String(caller._id) },
    });

    const result = await adminUsersSetAdminRolesAction(String(target._id), ['marketing']);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

