"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';
import { Club } from '@/interface/club.interface';
import ClubRegistrationForm from '@/components/club/ClubRegistrationForm';
import toast from 'react-hot-toast';
import axios from 'axios';

const MyClubPage = () => {
  const { user } = useUserContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    const checkUserClubs = async () => {
      if (!user) {
        // Redirect to login if no user is logged in
        router.push('/auth/login');
        return;
      }

      try {
        // Fetch user's clubs using axios
        const response = await axios.get<Club[]>(`/api/clubs/user?userId=${user._id}`);
        const userClubs = response.data;
        setClubs(userClubs);

        if (userClubs.length > 0) {
          // Redirect to the first club's page if user is associated with a club
          router.push(`/clubs/${userClubs[0]._id}`);
        }
      } catch (error) {
        toast.error('Hiba történt a klubok lekérdezése során');
        console.error('Error fetching user clubs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserClubs();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner w-12 h-12 text-primary"></div>
      </div>
    );
  }

  // If user is logged in and has no clubs, show registration form
  if (user && clubs.length === 0) {
    return (
      <section className="py-16 md:py-32 px-4 md:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-gradient-red mb-4 md:mb-6">
              Új Klub Regisztrálása
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Hozz létre egy új darts klubot, és kezdd el szervezni a közösségi eseményeket!
            </p>
          </div>
          <ClubRegistrationForm userId={user._id} />
        </div>
      </section>
    );
  }

  // Return null while redirecting (handled by useEffect)
  return null;
};

export default MyClubPage;