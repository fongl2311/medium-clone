import { Controller, Post, Body, Get, UseGuards, Request , UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService, UserResponse } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';

class UserRequest<T> {
  user: T;
}

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Đăng ký: POST /api/users
  @Post('users')
  async register(
    @Body('user') createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponse }> {
    const userResponse = await this.usersService.create(createUserDto);
    return { user: userResponse };
  }

  // Đăng nhập: POST /api/users/login
  @Post('users/login')
  async login(
    @Body('user') loginUserDto: LoginUserDto,
  ): Promise<{ user: UserResponse }> {
    const userResponse = await this.usersService.login(loginUserDto);
    return { user: userResponse };
  }

  // Lấy thông tin user hiện tại: GET /api/user
  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  async getCurrentUser(
    @Request() req: ExpressRequest & { user: { id: number; username: string; email: string } }, 
  ): Promise<{ user: UserResponse }> {
    const fullUser = await this.usersService.findById(req.user.id); 

    if (!fullUser) {
      throw new NotFoundException('Không tìm thấy người dùng tương ứng với token.');
    }

    const authHeader = req.headers.authorization;
    let token: string | undefined = undefined;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'token') { 
        token = parts[1];
      }
    }

   
    if (!token) {
        throw new UnauthorizedException('Token không hợp lệ hoặc thiếu.');
    }

    return {
      user: {
        email: fullUser.email,
        token: token,
        username: fullUser.username,
        bio: fullUser.bio,
        image: fullUser.image,
      },
    };
  }
}