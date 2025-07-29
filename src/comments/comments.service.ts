import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User , Comment } from '@prisma/client';

export interface CommentResponse { 
  id: number;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    username: string;
    bio: string | null;
    image: string | null;
  };
}

export interface CommentsResponse {
  comments: CommentResponse[];
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(slug: string, currentUser: User, dto: CreateCommentDto): Promise<CommentResponse> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundException('Bài viết không tồn tại.');
    }

    const newComment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        articleId: article.id, 
        authorId: currentUser.id, 
      },
      include: { 
        author: {
          select: { username: true, bio: true, image: true },
        },
      },
    });

    return this.formatCommentResponse(newComment as Comment & { author: { username: string; bio: string | null; image: string | null };});


  }

  async findCommentsForArticle(slug: string, currentUser?: User): Promise<CommentsResponse> {
    const comments = await this.prisma.comment.findMany({
      where: {
        article: { slug: slug },
      },
      include: {
        author: { 
          select: { username: true, bio: true, image: true },
        },
      },
      orderBy: { createdAt: 'asc' }, 
    });

    const formattedComments = comments.map(comment => this.formatCommentResponse(comment));

    return {
      comments: formattedComments,
    };
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const commentToDelete = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        authorId: userId, 
      },
    });

    if (!commentToDelete) {
      throw new NotFoundException('Bình luận không tồn tại hoặc bạn không có quyền xóa.');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  private formatCommentResponse(comment: Comment & { author: { username: string; bio: string | null; image: string | null; } }): CommentResponse {
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        username: comment.author.username,
        bio: comment.author.bio,
        image: comment.author.image,
      },
    };
  }
}