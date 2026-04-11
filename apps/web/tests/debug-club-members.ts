import dotenv from 'dotenv';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel, PlayerModel, UserModel } from '@tdarts/core';
import { ClubService } from '@tdarts/services';

async function main() {
  dotenv.config({ path: '../../.env' });
  dotenv.config({ path: '../../.env.local', override: true });
  dotenv.config({ path: '../.env' });
  dotenv.config({ path: '../.env.local', override: true });
  const clubId = process.argv[2] || '68f6afb145352f8e4076ed55';
  await connectMongo();

  const rawClub = await ClubModel.findById(clubId)
    .select('members admin moderators')
    .lean();
  const populatedClub = await ClubModel.findById(clubId)
    .select('members admin moderators')
    .populate('members', 'name userRef honors stats')
    .populate('admin', 'name username')
    .populate('moderators', 'name username')
    .lean();

  if (!rawClub) {
    console.error(`[debug-club-members] club not found: ${clubId}`);
    process.exit(1);
  }

  const members = ((rawClub as any).members || []).map((id: any) => String(id));
  const admins = ((rawClub as any).admin || []).map((id: any) => String(id));
  const moderators = ((rawClub as any).moderators || []).map((id: any) => String(id));

  const playersByMemberIds = await PlayerModel.find({ _id: { $in: members } })
    .select('_id userRef name')
    .lean();
  const roleUserIds = [...new Set([...admins, ...moderators])];
  const roleUsers = await UserModel.find({ _id: { $in: roleUserIds } }).select('_id name username').lean();
  const rolePlayersByUserRef = await PlayerModel.find({ userRef: { $in: roleUserIds } })
    .select('_id userRef name honors stats')
    .lean();

  const projected = await ClubService.getClubMembersForManagement(clubId, `debug-${Date.now()}`);

  const output = {
    clubId,
    raw: { members, admin: admins, moderators },
    populatedClubShape: {
      admin: ((populatedClub as any)?.admin || []).map((u: any) => ({
        type: typeof u,
        _id: u?._id ? String(u._id) : String(u),
        name: u?.name,
        username: u?.username,
      })),
      moderators: ((populatedClub as any)?.moderators || []).map((u: any) => ({
        type: typeof u,
        _id: u?._id ? String(u._id) : String(u),
        name: u?.name,
        username: u?.username,
      })),
    },
    playersByMemberIds: playersByMemberIds.map((p: any) => ({
      _id: String(p._id),
      userRef: p.userRef ? String(p.userRef) : null,
      name: p.name,
    })),
    roleUsers: roleUsers.map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      username: u.username,
    })),
    rolePlayersByUserRef: rolePlayersByUserRef.map((p: any) => ({
      _id: String(p._id),
      userRef: p.userRef ? String(p.userRef) : null,
      name: p.name,
      last10ClosedAvg: p?.stats?.last10ClosedAvg ?? null,
      honorsCount: Array.isArray(p?.honors) ? p.honors.length : 0,
    })),
    projectedMembers: projected.members.map((m) => ({
      _id: m._id,
      userRef: m.userRef || null,
      name: m.name,
      username: m.username,
      role: m.role,
      hasStats: !!m.stats,
      honorsCount: Array.isArray(m.honors) ? m.honors.length : 0,
    })),
    projectedCount: projected.members.length,
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[debug-club-members] failed', error);
    process.exit(1);
  });
