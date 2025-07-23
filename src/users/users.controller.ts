import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService, UserResponse } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';

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
  async getCurrentUser(@Request() req): Promise<{ user: UserResponse }> {
    const user = await this.usersService.findById(req.user.sub);
    
    const token = req.headers.authorization.split(' ')[1];
    
    return {
      user: {
        email: user.email,
        token: token,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}