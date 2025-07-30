import React from 'react';

interface ClubInfoProps {
  club: any;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onClubUpdated: () => void;
}

export default function ClubInfo({ club}: ClubInfoProps) {


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