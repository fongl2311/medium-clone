import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Put,
  ValidationPipe,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService, UserResponse } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { Request as ExpressRequest } from 'express';

class UserRequest<T> {
  user: T;
}

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('users')
  async register(
    @Body('user', new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createUserDto: CreateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.create(createUserDto);
  }


  @HttpCode(HttpStatus.OK)
  @Post('users/login')
  async login(
    @Body('user', new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    loginUserDto: LoginUserDto,
  ): Promise<UserResponse> {
    return this.usersService.login(loginUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  async getCurrentUser(@Request() req: ExpressRequest & { user: { id: number; username: string; email: string } }): Promise<UserResponse> {
      const userId = req.user.id; 
      
      if (userId === undefined || userId === null) { 
        throw new UnauthorizedException('Không thể lấy ID người dùng từ token.');
      }

      const fullUser = await this.usersService.findById(userId);

      if (!fullUser) {
        throw new NotFoundException('Không tìm thấy người dùng tương ứng với token.');
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Authorization header không tồn tại.');
      }
      const token = authHeader.split(' ')[1];

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


  @UseGuards(AuthGuard('jwt'))
  @Put('user')
  async updateCurrentUser(
    @Request() req: ExpressRequest & { user: { id: number } }, 
    @Body('user', new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const userId = req.user.id; 
    
    if (userId === undefined || userId === null) {
        throw new UnauthorizedException("Không thể lấy ID người dùng từ token.");
    }
    
    return this.usersService.update(userId, updateUserDto);
    }
}