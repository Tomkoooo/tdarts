
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-base-300 text-base-content border-t border-base-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Legal & Info */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">Információk</h3>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Adatkezelési tájékoztató
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Általános Szerződési Feltételek
            </Link>
            <Link href="/feedback" className="hover:text-primary transition-colors">
              Kapcsolat / Visszajelzés
            </Link>
            <p className="text-sm text-gray-500 mt-auto pt-4">
              &copy; {new Date().getFullYear()} tDarts. Minden jog fenntartva.
            </p>
          </div>

          {/* Column 2: Maintainer & OAC */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">Hálózat</h3>
            <div className="flex flex-col space-y-2">
              <p>
                Fenntartó:{" "}
                <Link
                  href="https://sironic.hu" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Sironic Kft.
                </Link>
              </p>
              
              <div className="mt-4 p-4 bg-base-200 rounded-lg border border-base-content/10">
                <p className="text-sm font-semibold mb-2">Próbáld ki az OAC portált is!</p>
                <Link 
                  href="https://amator.tdarts.hu" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-outline w-full"
                >
                  OAC - Amatőr Darts
                </Link>
              </div>
            </div>
          </div>

          {/* Column 3: Partners */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">Partnereink</h3>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="bg-white p-2 rounded-lg  transition duration-300 flex items-center justify-center h-20 w-20 relative">
                <Image 
                  src="/partners/mdsz_logo.png" 
                  alt="Magyar Darts Szövetség" 
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="bg-white p-2 rounded-lg  transition duration-300 flex items-center justify-center h-20 w-20 relative">
                <Image 
                  src="/partners/dartsbarlang_logo.png" 
                  alt="DartsBarlang" 
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="bg-white p-2 rounded-lg  transition duration-300 flex items-center justify-center h-20 w-20 relative">
                <Image 
                  src="/partners/remiz_logo.png" 
                  alt="Remiz Sport- és Eseményközpont" 
                  fill
                  className="object-contain p-1"
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Kiemelt partnereink, akik támogatják a magyar darts fejlődését.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
