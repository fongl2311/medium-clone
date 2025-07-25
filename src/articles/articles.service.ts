import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaModule } from 'src/prisma/prisma.module';
import { User, Article } from '@prisma/client';
import slugify from 'slugify';

export interface SingleArticleResponse {
  article: {
    slug: string;
    title: string;
    description: string;
    body: string;
    tagList: string[];
    createdAt: Date;
    updatedAt: Date;
    author: {
      username: string;
      bio: string | null;
      image: string | null;
    };
  };
}


export interface ArticlesResponse {
  articles: SingleArticleResponse['article'][];
  articlesCount: number;
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async createArticle(currentUser: User, dto: CreateArticleDto): Promise<SingleArticleResponse> {
    const slug = this.generateSlug(dto.title);

    const newArticle = await this.prisma.article.create({
      data: {
        title: dto.title,
        description: dto.description,
        body: dto.body,
        slug: slug,
        tagList: dto.tagList || [],
        authorId: currentUser.id,
      },
      include: {
        author: {
          select: { username: true, bio: true, image: true },
        },
      },
    });

    return this.formatArticleResponse(newArticle);
  }

  // --- GET SINGLE ARTICLE ---
  async findArticleBySlug(slug: string): Promise<SingleArticleResponse> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { username: true, bio: true, image: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết với slug: ${slug}`);
    }

    return this.formatArticleResponse(article);
  }

  async findAllArticles(
    query: { tag?: string; author?: string; limit?: number; offset?: number },
  ): Promise<ArticlesResponse> {
    const limit = parseInt(query.limit as any, 10) || 20; 
    const offset = parseInt(query.offset as any, 10) || 0; 

    const whereClause: any = {};
    if (query.tag) {
      whereClause.tagList = { has: query.tag };
    }
    if (query.author) {
      whereClause.author = { username: query.author };
    }

    const articles = await this.prisma.article.findMany({
      where: whereClause,
      include: {
        author: {
          select: { username: true, bio: true, image: true },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const count = await this.prisma.article.count({ where: whereClause });

    return {
    articles: articles.map(article => this.formatArticleResponse(article).article),
    articlesCount: count,
    };
  }

  // --- UPDATE ARTICLE ---
  async updateArticle(slug: string, userId: number, dto: UpdateArticleDto): Promise<SingleArticleResponse> {
    const existingArticle = await this.prisma.article.findFirst({
      where: { slug, authorId: userId },
    });

    if (!existingArticle) {
      throw new NotFoundException('Bài viết không tồn tại hoặc bạn không có quyền sửa.');
    }

    const updatedArticle = await this.prisma.article.update({
      where: { slug },
      data: {
        ...dto,
        ...(dto.title && { slug: this.generateSlug(dto.title) }),
      },
      include: {
        author: {
          select: { username: true, bio: true, image: true },
        },
      },
    });
    
    return this.formatArticleResponse(updatedArticle);
  }

  async deleteArticle(slug: string, userId: number): Promise<void> {
    await this.prisma.article.delete({
      where: { slug, authorId: userId },
    });
  }

  private generateSlug(title: string): string {
    const baseSlug = slugify(title, { lower: true, strict: true });
    const randomSuffix = (Math.random() + 1).toString(36).substring(7);
    return `${baseSlug}-${randomSuffix}`;
  }

  private formatArticleResponse(
    article: Article & { author: { username: string; bio: string | null; image: string | null; } }
    ): SingleArticleResponse {
    return {
        article: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tagList,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: {
            username: article.author.username,
            bio: article.author.bio,
            image: article.author.image,
        },
        },
    };
    }
}
export { CreateArticleDto , UpdateArticleDto};
