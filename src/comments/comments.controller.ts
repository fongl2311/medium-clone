import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  NotFoundException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '@prisma/client';
import { Request as ExpressRequest } from 'express';

@Controller('articles/:slug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createComment(
    @Param('slug') slug: string,
    @Request() req: ExpressRequest & { user: User }, 
    @Body('comment') createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(slug, req.user, createCommentDto);
  }

  @UseGuards(AuthGuard('jwt')) 
  @Get()
  async getComments(@Param('slug') slug: string, @Request() req: ExpressRequest & { user?: User }) {
    return this.commentsService.findCommentsForArticle(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteComment(
    @Param('slug') slug: string, 
    @Param('id') commentId: string, 
    @Request() req: ExpressRequest & { user: User },
  ) {
    const id = parseInt(commentId, 10);
    if (isNaN(id)) {
      throw new NotFoundException('Invalid comment ID.');
    }
    
    await this.commentsService.deleteComment(id, req.user.id);
    
    return HttpStatus.NO_CONTENT; 
  }
}