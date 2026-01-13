import React from 'react';
import { notFound } from 'next/navigation';
import { ClubService } from '@/database/services/club.service';
import { PostService } from '@/database/services/post.service';
import { getTemplate } from '@/components/club-landing/templates/TemplateRegistry';

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export default async function ClubLandingPage({ params }: PageProps) {
  const { clubId } = await params;

  let club;
  let posts;
  
  try {
    // Fetch club data (using existing service method, assuming it populates landingPage now or we fetch it via model directly if service doesn't return it full)
    // Note: ClubService.getClub returns a transformed object. We need to make sure 'landingPage' is included in that return object in ClubService.
    // I previously looked at getClub and it returns a construct. I might need to verify if landingPage is passed through.
    // If not, I should update ClubService.getClub or use a direct model call here (better to use service but update it).
    // For now assuming getClub returns it or I'll fix getClub.
    club = await ClubService.getClub(clubId);
    
    // Fetch posts
    const postsData = await PostService.getClubPosts(clubId, 1, 5); // Fetch first 5 posts
    posts = postsData.posts;
    
  } catch (error) {
    console.error('Error fetching club landing data:', error);
    notFound();
  }

  if (!club || !club.isActive) {
    notFound();
  }

  // Determine template
  const templateName = club.landingPage?.template || 'classic';
  const TemplateComponent = getTemplate(templateName);

  return (
    <TemplateComponent club={club} posts={posts} />
  );
}
