import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Token'),
      ignoreExpiration: false,
      secretOrKey: 'MY_SUPER_SECRET_KEY_123',
    });
  }

  async validate(payload: { sub: number; username: string; email: string }) {
    return { sub: payload.sub, username: payload.username, email: payload.email };
  }
}