import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AUTH_CONSTANT } from 'constants/AuthConstant'
import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma/prisma.service'
import { addDays, addMinutes } from 'date-fns'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly redis: RedisService) { }

  async requestOtp(mobile_number: string) {
    // In real app, send OTP via SMS here
    const dummy_otp = '123456';
    return { success: true, otp: dummy_otp };
  }

  async verifyOtp(mobile_number: string, otp: string) {
    const dummyOtp = '123456';
    if (otp !== dummyOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user = await this.prisma.user.findUnique({ where: { mobile: mobile_number } });

    if (!user) {
      user = await this.prisma.user.create({ data: { mobile: mobile_number } });
    }
    else {
      await this.prisma.user.update({
        data: {
          device_id: crypto.randomUUID()
        },
        where: {
          id: user.id
        }
      })
    }

    await this.redis.deleteCache(`user:${user.id}`)

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = await this.generateRefreshToken(user.id);

    return { access_token, refresh_token };
  }

  generateAccessToken(user_id: string) {
    const payload = { sub: user_id };
    return this.jwt.sign(payload, { expiresIn: '1m' });
  }


  async generateRefreshToken(user_id: string) {
    const refreshPayload = { 
      sub: user_id,
      jti: randomBytes(16).toString('hex')
    };
    const token = this.jwt.sign(refreshPayload, { expiresIn: '7d' });

    const expires_at = addDays(new Date(), 7);

    await this.prisma.refreshToken.create({
      data: { token, user_id: user_id, expires_at },
    });

    return token;
  }

  async refreshTokens(refresh_token?: string) {
    if (!refresh_token) {
      throw new UnauthorizedException('Missing refresh token')
    }

    const stored_token = await this.prisma.refreshToken.findUnique({
      where: { token: refresh_token },
    });

    if (!stored_token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored_token.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.delete({
      where: { token: refresh_token }
    });
    
    return {
      access_token: this.generateAccessToken(stored_token.user_id),
      refresh_token: await this.generateRefreshToken(stored_token.user_id),
    };
  }
}
