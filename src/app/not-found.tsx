import Link from 'next/link';
import { IconHome, IconSearch } from '@tabler/icons-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-500 mb-4">404</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-red-500 to-red-700 mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Oldal nem található
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            A keresett oldal nem létezik vagy áthelyezésre került.
          </p>
          <p className="text-gray-400">
            Ellenőrizd az URL-t vagy használd a navigációs menüket a megfelelő oldal eléréséhez.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold"
          >
            <IconHome className="w-5 h-5" />
            <span>Főoldal</span>
          </Link>
          
          <Link 
            href="/search"
            className="flex items-center space-x-2 px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-semibold"
          >
            <IconSearch className="w-5 h-5" />
            <span>Versenyek Keresése</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-gray-800 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-3">
            Segítségre van szükséged?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Gyakori oldalak:</h4>
              <ul className="space-y-1">
                <li>• <Link href="/" className="text-red-400 hover:text-red-300">Főoldal</Link></li>
                <li>• <Link href="/search" className="text-red-400 hover:text-red-300">Versenyek</Link></li>
                <li>• <Link href="/how-it-works" className="text-red-400 hover:text-red-300">Hogyan működik</Link></li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Hasznos linkek:</h4>
              <ul className="space-y-1">
                <li>• <Link href="/auth/login" className="text-red-400 hover:text-red-300">Bejelentkezés</Link></li>
                <li>• <Link href="/auth/register" className="text-red-400 hover:text-red-300">Regisztráció</Link></li>
                <li>• <Link href="/search" className="text-red-400 hover:text-red-300">Klub keresése</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
