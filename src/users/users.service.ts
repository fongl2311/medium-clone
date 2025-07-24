import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponse {
  user: {
    email: string;
    token: string;
    username: string;
    bio: string | null;
    image: string | null;
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private buildUserResponse(user: User): UserResponse {
    const payload = {
      id: user.id, 
      username: user.username,
      email: user.email,
    };
    const token = this.jwtService.sign(payload);

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

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email }, { username: dto.username }] } });
    if (existingUser) throw new ConflictException('Username hoặc email đã được sử dụng.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.prisma.user.create({ data: { ...dto, password: hashedPassword } });
    return this.buildUserResponse(newUser);
  }

  async login(dto: LoginUserDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }
    return this.buildUserResponse(user);
  }

  async update(userId: number, dto: UpdateUserDto): Promise<UserResponse> {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    const updatedUser = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.buildUserResponse(updatedUser);
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}