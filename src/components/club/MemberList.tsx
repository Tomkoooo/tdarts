import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash } from '@tabler/icons-react';
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

export default function MemberList({ members, userRole, userId, clubId, onAddMember, onClubUpdated, club }: MemberListProps) {
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

  const handleAddAdmin = async (memberId: string, memberName: string) => {
    if (!userId) return;
    const toastId = toast.loading('Admin hozzáadása...');
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addAdmin`, {
        userId: memberId,
        requesterId: userId,
      });
      onClubUpdated(response.data);
      toast.success(`${memberName} adminná nevezve!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Admin hozzáadása sikertelen', { id: toastId });
    }
  };

  return (
    <ul className="space-y-2">
      {members.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Nincsenek tagok.</p>
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
              roleBadge = <span className="badge badge-error ml-2">admin</span>;
            } else if (member.role === 'moderator') {
              isModerator = true;
              roleBadge = <span className="badge badge-info ml-2">moderátor</span>;
            } else if (isGuest) {
              roleBadge = <span className="badge badge-neutral ml-2">vendég</span>;
            } else if (member.username && member.username !== 'vendég') {
              roleBadge = <span className="badge badge-ghost ml-2">{member.username}</span>;
            } else {
              roleBadge = <span className="badge badge-ghost ml-2">tag</span>;
            }
            return (
              <li
                key={member._id}
                className="flex justify-between items-center gap-2 px-2 py-1"
              >
                <span className="flex items-center gap-2">
                  <span>{member.name}</span>
                  {roleBadge}
                </span>
                <div className="flex gap-2">
                  {/* Moderátorrá tétel: only if not already moderator or admin, not guest, not self, and current user is admin */}
                  {userRole === 'admin' && !isGuest && member._id !== userId && !isAdmin && !isModerator && (
                    <button
                      className="btn btn-xs btn-outline btn-info"
                      onClick={() => handleAddModerator(member._id, member.name)}
                    >
                      Moderátorrá tétel
                    </button>
                  )}
                  {/* Moderátor jog elvétel: only if member is moderator, not admin, not guest, not self, and current user is admin */}
                  {userRole === 'admin' && !isGuest && member._id !== userId && isModerator && !isAdmin && (
                    <button
                      className="btn btn-xs btn-outline btn-warning"
                      onClick={() => handleRemoveModerator(member._id, member.name)}
                    >
                      Moderátor jog elvétel
                    </button>
                  )}
                  {/* Remove member (admin or moderator, not self, allow for guests) */}
                  {(userRole === 'admin' || userRole === 'moderator') && member._id !== userId && (!isAdmin && !isModerator || isGuest) && (
                    <button
                      className="btn btn-xs btn-outline btn-error"
                      onClick={() => handleRemoveMember(member._id, member.name)}
                    >
                      <IconTrash className="w-4 h-4" />
                      Törlés
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