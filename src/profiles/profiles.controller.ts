import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
  Request,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfilesService, ProfileResponse } from './profiles.service';
import { User } from '@prisma/client';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guard'; 
import { Request as ExpressRequest } from 'express';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @UseGuards(OptionalAuthGuard) 
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
    @Request() req: ExpressRequest & { user?: User } 
  ) {
    return this.profilesService.getProfile(username, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':username/follow')
  async followUser(
    @Param('username') username: string,
    @Request() req: ExpressRequest & { user: User }, 
  ) {
    return this.profilesService.followUser(username, req.user);
  }

  @UseGuards(AuthGuard('jwt')) 
  @Delete(':username')
  async unfollowUser(
    @Param('username') username: string,
    @Request() req: ExpressRequest & { user: User },
  ) {
    return this.profilesService.unfollowUser(username, req.user);
  }
}