import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

export type User = any;
export interface UserResponse {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  constructor(private jwtService: JwtService) {}

  private buildUserResponse(user: User): UserResponse {
    const token = this.jwtService.sign({ 
        sub: user.id, 
        username: user.username, 
        email: user.email 
    });

    return {
      email: user.email,
      token: token,
      username: user.username,
      bio: user.bio || null,
      image: user.image || null,
    };
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existingUser = this.users.find(u => u.username === dto.username || u.email === dto.email);
    if (existingUser) {
      throw new ConflictException('Username hoặc email đã được sử dụng.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = {
      id: Date.now(), 
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    };
    this.users.push(newUser);

    return this.buildUserResponse(newUser);
  }

  async login(dto: LoginUserDto): Promise<UserResponse> {
    const user = this.users.find(u => u.email === dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    return this.buildUserResponse(user);
  }

  async findById(id: number): Promise<User> {
    return this.users.find(u => u.id === id);
  }
}