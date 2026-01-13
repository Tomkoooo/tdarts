import React from 'react';
import { LandingTemplateComponent } from './BaseTemplate';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Image from 'next/image';

export const ClassicTemplate: LandingTemplateComponent = ({ club, posts }) => {
  const { landingPage } = club;
  
  // Safe defaults if landingPage is somehow partial
  const primaryColor = landingPage?.primaryColor || '#000000';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div 
        className="w-full h-64 md:h-96 relative flex items-center justify-center bg-gray-800 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        {landingPage?.coverImage && (
          <Image 
            src={landingPage.coverImage} 
            alt="Cover" 
            fill 
            className="object-cover opacity-50"
          />
        )}
        <div className="relative z-10 text-center p-4">
          {landingPage?.logo && (
             <div className="mx-auto mb-4 w-24 h-24 md:w-32 md:h-32 relative rounded-full overflow-hidden border-4 border-white">
                <Image src={landingPage.logo} alt="Logo" fill className="object-cover" />
             </div>
          )}
          <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">{club.name}</h1>
          <p className="mt-2 text-xl opacity-90">{club.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content: About & Posts */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* About Section */}
          <section id="about" className="scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 border-b pb-2" style={{ borderColor: primaryColor }}>About Us</h2>
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: landingPage?.aboutText || '' }} />
            
            {landingPage?.aboutImages && landingPage.aboutImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {landingPage.aboutImages.map((img, idx) => (
                   <div key={idx} className="relative aspect-video rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                     <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                   </div>
                ))}
              </div>
            )}
          </section>

          {/* Posts Section */}
          <section id="news" className="scroll-mt-20">
             <div className="flex justify-between items-center mb-6 border-b pb-2" style={{ borderColor: primaryColor }}>
               <h2 className="text-3xl font-bold">Latest News</h2>
             </div>
             <div className="space-y-6">
                {posts && posts.length > 0 ? (
                  posts.map(post => (
                    <Card key={post._id as string} className="overflow-hidden">
                      {post.images && post.images.length > 0 && (
                        <div className="relative h-48 w-full">
                           <Image src={post.images[0]} alt={post.title} fill className="object-cover" />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-2xl">{post.title}</CardTitle>
                        <div className="text-sm text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="line-clamp-3 prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: post.content }} />
                        <Button variant="link" className="px-0 mt-2" style={{ color: primaryColor }}>Read more</Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No news yet.</p>
                )}
             </div>
          </section>
        </div>

        {/* Sidebar: Info, Members, Tournaments */}
        <div className="space-y-8">
            <Card>
              <CardHeader className="bg-gray-100 dark:bg-gray-800">
                <CardTitle>Club Info</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <p><strong>Location:</strong> {club.location}</p>
                 {club.contact?.email && <p><strong>Email:</strong> <a href={`mailto:${club.contact.email}`} className="hover:underline">{club.contact.email}</a></p>}
                 {club.contact?.website && <p><strong>Website:</strong> <a href={club.contact.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{club.contact.website}</a></p>}
              </CardContent>
            </Card>
            
             {/* Simple Members Preview */}
             {landingPage?.showMembers && club.members && club.members.length > 0 && (
               <Card>
                 <CardHeader>
                   <CardTitle>Members</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {club.members.slice(0, 10).map((m: any) => (
                        <span key={m._id} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{m.name}</span>
                      ))}
                      {club.members.length > 10 && <span className="text-sm text-gray-500 pt-1">+{club.members.length - 10} more</span>}
                    </div>
                 </CardContent>
               </Card>
             )}
        </div>
      </div>
    </div>
  );
};
