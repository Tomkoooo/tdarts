
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Club } from '@/types/clubSchema';

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    password: '',
  });
  const router = useRouter();

  // Fetch clubs on mount
  useEffect(() => {
    const fetchClubs = async () => {
      const toastId = toast.loading('Klubok betöltése...');
      try {
        const res = await fetch('/api/club');
        if (!res.ok) throw new Error('Nem sikerült a klubok betöltése');
        const data = await res.json();
        setClubs(data.clubs);
        toast.success('Klubok betöltve!', { id: toastId });
      } catch (err) {
        toast.error('Klubok betöltése sikertelen', { id: toastId });
        console.error('Hiba a klubok betöltésekor:', err);
      }
    };
    fetchClubs();
  }, []);

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return clubs;
    return clubs.filter(club =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clubs, searchQuery]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle club creation
  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.location || !formData.password) {
      toast.error('Név, helyszín és jelszó megadása kötelező.');
      return;
    }

    const toastId = toast.loading('Klub létrehozása...');
    try {
      const res = await fetch('/api/club/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Klub létrehozása sikertelen');
      }

      const data = await res.json();
      setClubs(prev => [...prev, { ...formData, _id: data.clubId, createdAt: data.createdAt, code: data.code, players: [], tournaments: [], updatedAt: data.updatedAt }]);
      setFormData({ name: '', description: '', location: '', password: '' });
      setIsModalOpen(false);
      toast.success('Klub sikeresen létrehozva!', { id: toastId });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Klub létrehozása sikertelen', { id: toastId });
    }
  };

  return (
    <div className="w-full min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-base-content mb-6">Klubok</h1>

        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Keresés klubnév alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-md w-full pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
              </button>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-outline btn-sm"
          >
            Új Klub Létrehozása
          </button>
        </div>

        {/* Club List */}
        {filteredClubs.length === 0 && !clubs.length && (
          <div className="text-center text-base-content">Nincsenek klubok.</div>
        )}
        {filteredClubs.length === 0 && clubs.length > 0 && (
          <div className="text-center text-base-content">Nincs találat a keresésre.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => (
            <Link key={club._id} href={`/clubs/${club.code}`}>
              <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200">
                <div className="card-body">
                  <h2 className="card-title text-base-content">{club.name}</h2>
                  {club.description && (
                    <p className="text-base-content/70 italic line-clamp-2">{club.description.slice(0,200)}...</p>
                  )}
                  <p className="text-base-content/80"><span className="font-semibold">Helyszín:</span> {club.location}</p>
                  <p className="text-base-content/80"><span className="font-semibold">Létrehozva:</span> {new Date(club.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('-', '.')}</p>
                  <div className="card-actions justify-end">
                    <button className="btn btn-primary btn-sm">Tovább</button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Create Club Modal */}
        <dialog open={isModalOpen} className="modal">
          <div className="modal-box bg-base-100">
            <h2 className="text-2xl font-bold text-base-content mb-4">Új Klub Létrehozása</h2>
            <form onSubmit={handleCreateClub}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Név *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input input-bordered input-md w-full"
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Leírás</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered textarea-md w-full"
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Helyszín *</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="input input-bordered input-md w-full"
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Jelszó *</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input input-bordered input-md w-full"
                  required
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Létrehozás
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsModalOpen(false)}>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
}
