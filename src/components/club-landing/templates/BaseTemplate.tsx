import { ClubDocument } from '@/interface/club.interface';
import { PostDocument } from '@/database/models/post.model';

export interface LandingTemplateProps {
  club: ClubDocument;
  posts: PostDocument[];
}

export type LandingTemplateComponent = React.FC<LandingTemplateProps>;
