import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface';

interface MemberListProps {
  members: { _id: string; name: string; username: string }[];
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

  return (
    <ul className="space-y-2">
      {members.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Nincsenek tagok.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(member => (
            <li
              key={member._id}
              className="flex justify-between items-center p-2"
            >
              <span className="badge badge-primary badge-lg">{member.name} ({member.username})</span>
              <div className="flex gap-2">
                {userRole === 'admin' && (
                  <>
                    {member._id !== userId && (
                      <>
                        {member._id in (club.moderators || []) ? (
                          <button
                            className="glass-button btn btn-xs bg-gradient-to-r from-[hsl(40,80%,60%)] to-[hsl(60,80%,60%)] hover:scale-105 transition-all duration-300"
                            onClick={() => handleRemoveModerator(member._id, member.name)}
                          >
                            Moderátor törlése
                          </button>
                        ) : (
                          <button
                            className="glass-button btn btn-xs bg-gradient-to-r from-[hsl(0,80%,60%)] to-[hsl(20,80%,60%)] hover:scale-105 transition-all duration-300"
                            onClick={() => handleAddModerator(member._id, member.name)}
                          >
                            Moderátorrá tétel
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {(userRole === 'admin' || userRole === 'moderator') && member._id !== userId && (
                  <button
                    className="glass-button btn btn-xs btn-error hover:scale-105 transition-all duration-300"
                    onClick={() => handleRemoveMember(member._id, member.name)}
                  >
                    <IconTrash className="w-4 h-4" />
                    Törlés
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ul>
  );
}