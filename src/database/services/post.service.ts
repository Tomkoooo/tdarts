import { PostDocument, PostModel } from '@/database/models/post.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { Types } from 'mongoose';

export class PostService {
  static async createPost(
    clubId: string,
    authorId: string,
    postData: {
      title: string;
      content: string;
      images?: string[];
      video?: string;
      tags?: string[];
    }
  ): Promise<PostDocument> {
    await connectMongo();

    if (!postData.title) {
        throw new BadRequestError('Title is required');
    }

    const post = await PostModel.create({
      clubId: new Types.ObjectId(clubId),
      authorId: new Types.ObjectId(authorId),
      ...postData
    });

    return post;
  }

  static async getClubPosts(clubId: string, page = 1, limit = 10): Promise<{ posts: PostDocument[]; total: number }> {
    await connectMongo();
    
    if (!Types.ObjectId.isValid(clubId)) {
        throw new BadRequestError('Invalid Club ID');
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      PostModel.find({ clubId: new Types.ObjectId(clubId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name username'), // Adjust populated fields as needed
      PostModel.countDocuments({ clubId: new Types.ObjectId(clubId) }),
    ]);

    return { posts, total };
  }

  static async deletePost(postId: string): Promise<void> {
      await connectMongo();
      await PostModel.findByIdAndDelete(postId);
  }

  static async updatePost(
    postId: string,
    postData: {
      title?: string;
      content?: string;
      images?: string[];
      video?: string;
      tags?: string[];
    }
  ): Promise<PostDocument | null> {
    await connectMongo();
    if (!Types.ObjectId.isValid(postId)) {
        throw new BadRequestError('Invalid Post ID');
    }

    const post = await PostModel.findByIdAndUpdate(
      postId,
      { $set: postData },
      { new: true }
    );

    return post;
  }
}
