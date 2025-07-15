import { Club } from '@/interface/club.interface';
import { IconEdit } from '@tabler/icons-react';

interface ClubInfoProps {
  club: Club;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onEdit: () => void;
}

export default function ClubInfo({ club, userRole, onEdit }: ClubInfoProps) {
  return (
    <div className="glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">
          Klub Adatok
        </h2>
        {userRole === 'admin' && (
          <button
            className="btn btn-primary btn-outline btn-sm"
            onClick={onEdit}
          >
            <IconEdit className="w-5 h-5" />
            Szerkesztés
          </button>
        )}
      </div>
      <div className="space-y-4">
        <p className="text-[hsl(var(--foreground))]"><span className="font-semibold">Név:</span> {club.name}</p>
        <p className="text-[hsl(var(--muted-foreground))]"><span className="font-semibold">Leírás:</span> {club.description}</p>
        <p className="text-[hsl(var(--muted-foreground))]"><span className="font-semibold">Helyszín:</span> {club.location}</p>
        <p className="text-[hsl(var(--muted-foreground))]"><span className="font-semibold">Létrehozva:</span> {new Date(club.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('-', '.')}</p>
      </div>
    </div>
  );
}