import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ArticlesService,
  SingleArticleResponse,
  ArticlesResponse,
} from './articles.service';
import { CreateArticleDto } from "./dto/create-article.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";
import { User } from '@prisma/client';
import { OptionalAuthGuard } from "../auth/optional-auth.guard";
import { CreateArticleDto } from "./dto/create-article.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";
import { Request as ExpressRequest } from 'express';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // POST /api/articles - Create Article
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Request() req: ExpressRequest & { user: User },
    @Body('article') createArticleDto: CreateArticleDto,
  ) {
    return this.articlesService.create(req.user, createArticleDto);
  }

  // GET /api/articles/:slug - Get Single Article
  @UseGuards(OptionalAuthGuard)
  @Get(':slug')
  async getArticleBySlug(
    @Param('slug') slug: string,
    @Request() req: ExpressRequest & { user?: User }
  ) {
    return this.articlesService.findArticleBySlug(slug);
  }
  // GET /api/articles - List Articles
  @UseGuards(OptionalAuthGuard)
  @Get()
  async getArticles(
    @Query() queryParams: { tag?: string; author?: string; favorited?: string; limit?: number; offset?: number },
    @Request() req: { user?: User },
  ): Promise<ArticlesResponse> {
    return this.articlesService.findAllArticles(queryParams);
  }

  // PUT /api/articles/:slug - Update Article
  @UseGuards(AuthGuard('jwt'))
  @Put(':slug')
  async updateArticle(
    @Param('slug') slug: string,
    @Request() req: ExpressRequest & { user: User },
    @Body('article') updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(slug, req.user.id, updateArticleDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':slug')
  async deleteArticle(@Param('slug') slug: string, @Request() req: ExpressRequest & { user: User }): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.articlesService.deleteArticle(slug, userId); 
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/favorite')
  async favoriteArticle(@Param('slug') slug: string, @Request() req: ExpressRequest & { user: User }) {
    return this.articlesService.favoriteArticle(slug, req.user.id);
  }

  // DELETE /api/articles/:slug/favorite
  @UseGuards(AuthGuard('jwt'))
  @Delete(':slug/favorite')
  async unfavoriteArticle(@Param('slug') slug: string, @Request() req: ExpressRequest & { user: User }) {
    return this.articlesService.unfavoriteArticle(slug, req.user.id);
  }
}
}
