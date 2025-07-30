import axios from 'axios';
import toast from 'react-hot-toast';
import { IconTrash } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface'; // If not available, use <span className="badge ..."> directly

interface MemberListProps {
  members: { _id: string; role: 'admin' | 'moderator' | 'member'; userRef?: string; name: string; username: string }[];
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  userId?: string;
  clubId: string;
  club: Club;
  onAddMember: () => void;
  onClubUpdated: (club: Club) => void;
}

export default function MemberList({ members, userRole, userId, clubId, onClubUpdated }: MemberListProps) {
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!userId) return;
    const toastId = toast.loading('Tag törlése...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeMember`, {
        userId: memberId,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success(`${memberName} törölve!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tag törlése sikertelen', { id: toastId });
    }
  };

  const handleAddModerator = async (memberId: string, memberName: string) => {
    if (!userId) return;
    const toastId = toast.loading('Moderátor hozzáadása...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addModerator`, {
        userId: memberId,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success(`${memberName} moderátorrá nevezve!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Moderátor hozzáadása sikertelen', { id: toastId });
    }
  };

  const handleRemoveModerator = async (memberId: string, memberName: string) => {
    if (!userId) return;
    const toastId = toast.loading('Moderátor törlése...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeModerator`, {
        userId: memberId,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success(`${memberName} moderátori jogai visszavonva!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Moderátor törlése sikertelen', { id: toastId });
    }
  };

  return (
    <ul className="space-y-2">
      {members.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))] text-sm md:text-base">Nincsenek tagok.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(member => {
            // Determine role badge
            let roleBadge = null;
            let isAdmin = false;
            let isModerator = false;
            const isGuest = member.username === 'vendég';
            if (member.role === 'admin') {
              isAdmin = true;
              roleBadge = <span className="badge badge-error badge-sm md:badge-md ml-1 md:ml-2 text-xs">admin</span>;
            } else if (member.role === 'moderator') {
              isModerator = true;
              roleBadge = <span className="badge badge-info badge-sm md:badge-md ml-1 md:ml-2 text-xs">moderátor</span>;
            } else if (isGuest) {
              roleBadge = <span className="badge badge-neutral badge-sm md:badge-md ml-1 md:ml-2 text-xs">vendég</span>;
            } else if (member.username && member.username !== 'vendég') {
              roleBadge = <span className="badge badge-ghost badge-sm md:badge-md ml-1 md:ml-2 text-xs">{member.username}</span>;
            } else {
              roleBadge = <span className="badge badge-ghost badge-sm md:badge-md ml-1 md:ml-2 text-xs">tag</span>;
            }
            return (
              <li
                key={member._id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-base-200 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm md:text-base font-medium">{member.name}</span>
                  {roleBadge}
                </div>
                <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                  {/* Moderátorrá tétel: only if not already moderator or admin, not guest, not self, and current user is admin */}
                  {userRole === 'admin' && !isGuest && member._id !== userId && !isAdmin && !isModerator && (
                    <button
                      className="btn btn-xs btn-outline btn-info text-xs"
                      onClick={() => handleAddModerator(member._id, member.name)}
                    >
                      Moderátorrá tétel
                    </button>
                  )}
                  {/* Moderátor jog elvétel: only if member is moderator, not admin, not guest, not self, and current user is admin */}
                  {userRole === 'admin' && !isGuest && member._id !== userId && isModerator && !isAdmin && (
                    <button
                      className="btn btn-xs btn-outline btn-warning text-xs"
                      onClick={() => handleRemoveModerator(member._id, member.name)}
                    >
                      Moderátor jog elvétel
                    </button>
                  )}
                  {/* Remove member (admin or moderator, not self, allow for guests) */}
                  {(userRole === 'admin' || userRole === 'moderator') && member._id !== userId && (!isAdmin && !isModerator || isGuest) && (
                    <button
                      className="btn btn-xs btn-outline btn-error text-xs"
                      onClick={() => handleRemoveMember(member._id, member.name)}
                    >
                      <IconTrash className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Törlés</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ul>
  );
}