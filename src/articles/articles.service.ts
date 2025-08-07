import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
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
    favorited: boolean;    
    favoritesCount: number;  
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

    return this.formatArticleResponse(newArticle, false, 0);
  }

  async findArticleBySlug(slug: string, currentUser?: User): Promise<SingleArticleResponse> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { username: true, bio: true, image: true },
        },
        _count: {
          select: { favoritedBy: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết với slug: ${slug}`);
    }

    let isFavorited = false;
    if (currentUser) {
      const favorite = await this.prisma.userFavoriteArticle.findUnique({
        where: { userId_articleSlug: { userId: currentUser.id, articleSlug: slug } }
      });
      isFavorited = !!favorite;
    }

    return this.formatArticleResponse(article, isFavorited, article._count.favoritedBy);
  }

async findAllArticles(
  query: { tag?: string; author?: string; favorited?: string; limit?: number; offset?: number },
  currentUser?: User,
): Promise<ArticlesResponse> {
  const { tag, author, favorited, limit = 20, offset = 0 } = query;

  const whereClause: any = {};
  if (tag) {
    whereClause.tagList = { has: tag };
  }
  if (author) {
    whereClause.author = { username: author };
  }

  let favoritedSlugs: string[] = [];

  if (favorited && currentUser) {
    const userFavorites = await this.prisma.userFavoriteArticle.findMany({
      where: { userId: currentUser.id },
      select: { articleSlug: true },
    });
    favoritedSlugs = userFavorites.map(fav => fav.articleSlug);
    whereClause.slug = { in: favoritedSlugs };
  } else if (favorited) {
    return { articles: [], articlesCount: 0 };
  }

  const articles = await this.prisma.article.findMany({
    where: whereClause,
    include: {
      author: {
        select: { username: true, bio: true, image: true },
      },
      _count: { select: { favoritedBy: true } },
    },
    skip: offset,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  const count = await this.prisma.article.count({ where: whereClause });

  const articleResponses = await Promise.all(
    articles.map(async (article) => {
      const favoritesCount = article._count?.favoritedBy || 0
      let isFavorited = false

      if (currentUser && favoritedSlugs.length) {
        isFavorited = favoritedSlugs.includes(article.slug)
      } else if (currentUser) {
        const favorite = await this.prisma.userFavoriteArticle.findUnique({
          where: {
            userId_articleSlug: {
              userId: currentUser.id,
              articleSlug: article.slug,
            },
          },
        });
        isFavorited = !!favorite;
      }

      const formatted = await this.formatArticleResponse(article, isFavorited, favoritesCount);
      return formatted.article;
    })
  );

  return {
    articles: articleResponses,
    articlesCount: count,
  };
}


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
    
    const isFavorited = await this.prisma.userFavoriteArticle.findUnique({ where: { userId_articleSlug: { userId: userId, articleSlug: slug } } });
    const currentFavoritesCount = await this.prisma.userFavoriteArticle.count({ where: { articleSlug: slug } });

    return this.formatArticleResponse(updatedArticle, !!isFavorited, currentFavoritesCount);
  }

async deleteArticle(slug: string, userId: number): Promise<{ message: string }> { 
  const existingArticle = await this.prisma.article.findFirst({
    where: { 
      slug: slug,
      authorId: userId 
  });

  if (!existingArticle) {
    throw new NotFoundException('Bài viết không tồn tại hoặc bạn không có quyền xóa.');
  }

  async favoriteArticle(slug: string, userId: number): Promise<SingleArticleResponse> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, bio: true, image: true } },
        _count: { select: { favoritedBy: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with slug ${slug} not found`);
    }

    await this.prisma.userFavoriteArticle.upsert({
      where: { userId_articleSlug: { userId: userId, articleSlug: slug } },
      update: {},
      create: { userId: userId, articleSlug: slug },
    });

    const updatedArticle = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, bio: true, image: true } },
        _count: { select: { favoritedBy: true } }, 
      },
    });

    if (!updatedArticle) {
      throw new InternalServerErrorException('Lỗi khi cập nhật trạng thái favorite.');
    }

    return this.formatArticleResponse(updatedArticle, true, updatedArticle._count.favoritedBy);
  }

  async unfavoriteArticle(slug: string, userId: number): Promise<SingleArticleResponse> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, bio: true, image: true } },
        _count: { select: { favoritedBy: true } }, 
      },
    });

    if (!article) {
      throw new NotFoundException('Bài viết không tồn tại.');
    }

    await this.prisma.userFavoriteArticle.delete({
      where: { userId_articleSlug: { userId: userId, articleSlug: slug } },
    });

    const updatedArticle = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, bio: true, image: true } },
        _count: { select: { favoritedBy: true } }, 
      },
    });

    if (!updatedArticle) {
      throw new InternalServerErrorException('Lỗi khi cập nhật trạng thái unfavorite.');
    }

    return this.formatArticleResponse(updatedArticle, false, updatedArticle._count.favoritedBy);
  }
  await this.prisma.article.delete({
    where: { id: existingArticle.id },
  });
  
  return { message: 'Bài viết đã được xóa thành công.' };
}

  private generateSlug(title: string): string {
    const baseSlug = slugify(title, { lower: true, strict: true });
    const randomSuffix = (Math.random() + 1).toString(36).substring(7);
    return `${baseSlug}-${randomSuffix}`;
  }
  private formatArticleResponse(
    article: Article & { author: { username: string; bio: string | null; image: string | null; }; _count?: { favoritedBy: number } },
    isFavorited: boolean,
    favoritesCount: number
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
        favorited: isFavorited, 
        favoritesCount: favoritesCount, 
        author: {
          username: article.author.username,
          bio: article.author.bio,
          image: article.author.image,
        },
      },
    };

  }
}

