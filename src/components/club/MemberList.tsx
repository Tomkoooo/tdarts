import axios from 'axios';
import toast from 'react-hot-toast';
import { IconTrash, IconUser, IconCrown, IconShield, IconChartBar } from '@tabler/icons-react';
import { Club } from '@/interface/club.interface';
import PlayerStatsModal from '@/components/player/PlayerStatsModal';
import { useState } from 'react';

interface MemberListProps {
  members: { _id: string; role: 'admin' | 'moderator' | 'member'; userRef?: string; name: string; username: string }[];
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  userId?: string;
  clubId: string;
  club: Club;
  onAddMember: () => void;
  onClubUpdated: (club: Club) => void;
  showActions?: boolean; // New prop to control whether to show action buttons
}

export default function MemberList({ members, userRole, userId, clubId, onClubUpdated, showActions = true }: MemberListProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
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

  const handleViewStats = async (member: any) => {
    try {
      // Fetch player stats from the API
      const response = await axios.get(`/api/players/${member._id}/stats`);
      if (response.data.success) {
        setSelectedPlayer(response.data.player);
        setShowStatsModal(true);
      }
    } catch (err) {
      toast.error('Nem sikerült betölteni a statisztikákat');
    }
  };

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <div className="text-center py-8">
          <IconUser className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
          <p className="text-base-content/60 text-lg">Nincsenek tagok.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map(member => {
            const isGuest = member.username === 'vendég';
            const isRegistered = member.username && member.username !== 'vendég';
            
            // Determine role and icon
            let roleIcon = null;
            let roleText = '';
            let roleColor = '';
            
            if (member.role === 'admin') {
              roleIcon = <IconCrown className="w-4 h-4" />;
              roleText = 'Adminisztrátor';
              roleColor = 'text-error';
            } else if (member.role === 'moderator') {
              roleIcon = <IconShield className="w-4 h-4" />;
              roleText = 'Moderátor';
              roleColor = 'text-info';
            } else {
              roleIcon = <IconUser className="w-4 h-4" />;
              roleText = 'Tag';
              roleColor = 'text-base-content/70';
            }

            return (
              <div
                key={member._id}
                className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow"
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar/Icon */}
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center">
                        <img
                          src={`https://avatar.iran.liara.run/username?username=${member.name.split(' ')[0]}+${member.name.split(' ')[1]}`}
                          alt="avatar"
                          loading="lazy"
                        />
                        </div>
                      </div>
                      
                      {/* Member Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          <div className={`flex items-center gap-1 ${roleColor}`}>
                            {roleIcon}
                            <span className="text-sm font-medium">{roleText}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-base-content/60">
                          {isRegistered ? (
                            <>
                              <span className="badge badge-success badge-xs">Regisztrált</span>
                              <span>@{member.username}</span>
                            </>
                          ) : (
                            <span className="badge badge-neutral badge-xs">Vendég</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Stats Button - Always visible */}
                      <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => handleViewStats(member)}
                        title="Statisztikák megtekintése"
                      >
                        <IconChartBar className="w-4 h-4" />
                      </button>
                      
                      {/* Admin/Moderator Actions - Only when showActions is true */}
                      {showActions && (
                        <>
                          {/* Admin Actions */}
                          {userRole === 'admin' && member._id !== userId && member.role !== 'admin' && (
                            <div className="dropdown dropdown-end">
                              <button className="btn btn-sm btn-outline btn-primary">
                                Műveletek
                              </button>
                              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                                {!isGuest && member.role === 'member' && (
                                  <li>
                                    <button
                                      onClick={() => handleAddModerator(member._id, member.name)}
                                      className="flex items-center gap-2"
                                    >
                                      <IconShield className="w-4 h-4" />
                                      Moderátorrá tétel
                                    </button>
                                  </li>
                                )}
                                {!isGuest && member.role === 'moderator' && (
                                  <li>
                                    <button
                                      onClick={() => handleRemoveModerator(member._id, member.name)}
                                      className="flex items-center gap-2 text-warning"
                                    >
                                      <IconShield className="w-4 h-4" />
                                      Moderátor jog elvétel
                                    </button>
                                  </li>
                                )}
                                <li>
                                  <button
                                    onClick={() => handleRemoveMember(member._id, member.name)}
                                    className="flex items-center gap-2 text-error"
                                  >
                                    <IconTrash className="w-4 h-4" />
                                    Törlés
                                  </button>
                                </li>
                              </ul>
                            </div>
                          )}
                          
                          {/* Moderator Actions */}
                          {(userRole === 'moderator') && member._id !== userId && member.role === 'member' && (
                            <button
                              className="btn btn-sm btn-outline btn-error"
                              onClick={() => handleRemoveMember(member._id, member.name)}
                            >
                              <IconTrash className="w-4 h-4" />
                              Törlés
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Stats Modal */}
      {showStatsModal && selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
}