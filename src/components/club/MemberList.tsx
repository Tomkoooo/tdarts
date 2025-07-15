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
    <div className="glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">
          Tagok
        </h2>
        {(userRole === 'admin' || userRole === 'moderator') && (
          <button
            className="btn btn-primary btn-outline btn-sm"
            onClick={onAddMember}
          >
            <IconPlus className="w-5 h-5" />
            Tag Hozzáadása
          </button>
        )}
      </div>
      {members.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Nincsenek tagok.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(member => (
            <li
              key={member._id}
              className="flex justify-between items-center p-2 bg-[hsl(var(--background)/0.5)] rounded-md hover:bg-[hsl(var(--primary)/0.1)] transition-all duration-200"
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
    </div>
  );
}