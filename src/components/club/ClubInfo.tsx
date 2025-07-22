import React, { useState } from 'react';
import PlayerSearch from './PlayerSearch';
import AddPlayerModal from './AddPlayerModal';
import CreateTournamentModal from './CreateTournamentModal';
import TournamentList from './TournamentList';

interface ClubInfoProps {
  club: any;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onClubUpdated: () => void;
}

export default function ClubInfo({ club, userRole, onClubUpdated }: ClubInfoProps) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);

  // Jogosultságok
  const canEditBoards = userRole === 'admin' || userRole === 'moderator';
  const canManageMembers = userRole === 'admin' || userRole === 'moderator';
  const canManageModerators = userRole === 'admin';
  const canCreateTournament = userRole === 'admin' || userRole === 'moderator';

  // Szekciók: adminok, moderátorok, tagok
  const admins = club.admin || [];
  const moderators = club.moderators || [];
  const members = club.members || [];

  // Dropdown menu for actions
  function MemberActions({
    canRemove, canPromote, canDemote, onRemove, onPromote, onDemote
  }: {
    canRemove?: boolean;
    canPromote?: boolean;
    canDemote?: boolean;
    onRemove?: () => void;
    onPromote?: () => void;
    onDemote?: () => void;
  }) {
    if (!canRemove && !canPromote && !canDemote) return null;
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-xs btn-ghost px-2">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
        </label>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
          {canRemove && <li><button className="text-error" onClick={onRemove}>Eltávolítás</button></li>}
          {canPromote && <li><button onClick={onPromote}>Moderátorrá tesz</button></li>}
          {canDemote && <li><button onClick={onDemote}>Taggá tesz</button></li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2 md:px-0 space-y-10">
      {/* Klub fő adatok */}
      <section className="bg-base-200 rounded-2xl shadow-xl p-6 flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-primary mb-1">{club.name}</h2>
        <div className="text-lg text-base-content/80 mb-2">{club.description}</div>
        <div className="flex flex-wrap gap-4 items-center text-base-content/60">
          <span>Helyszín: <span className="font-medium text-base-content">{club.location}</span></span>
        </div>
      </section>
    </div>
  );
}