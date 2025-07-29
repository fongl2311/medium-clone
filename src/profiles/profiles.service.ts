// src/profiles/profiles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

export interface ProfileResponse {
  profile: {
    username: string;
    bio: string | null;
    image: string | null;
    following: boolean;
  };
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string, currentUser?: User): Promise<ProfileResponse> {
    const profileUser = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        bio: true,
        image: true,
        id: true,
      },
    });

    if (!profileUser) {
      throw new NotFoundException('User profile not found.');
    }

    let isFollowing = false;
    if (currentUser) {
      const followRecord = await this.prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: profileUser.id,
          },
        },
      });
      isFollowing = !!followRecord;
    }

    return this.formatProfileResponse(profileUser, isFollowing);
  }

  async followUser(username: string, currentUser: User): Promise<ProfileResponse> {
    const profileToFollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!profileToFollow || profileToFollow.id === currentUser.id) {
      throw new NotFoundException('Invalid user to follow.');
    }

    await this.prisma.follows.upsert({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: profileToFollow.id,
        },
      },
      update: {},
      create: {
        followerId: currentUser.id,
        followingId: profileToFollow.id,
      },
    });

    return this.formatProfileResponse(profileToFollow, true);
  }

  async unfollowUser(username: string, currentUser: User): Promise<ProfileResponse> {
    const profileToUnfollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!profileToUnfollow) {
      throw new NotFoundException('User profile not found.');
    }

    try {
      await this.prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: profileToUnfollow.id,
          },
        },
      });
    } catch (_) {}

    return this.formatProfileResponse(profileToUnfollow, false);
  }

  private formatProfileResponse(
    user: { username: string; bio: string | null; image: string | null },
    following: boolean,
  ): ProfileResponse {
    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }
}
