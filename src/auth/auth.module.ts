import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { PrismaModule } from 'src/prisma/prisma.module'
import { JwtModule } from '@nestjs/jwt'
import { AUTH_CONSTANT } from 'constants/AuthConstant'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: AUTH_CONSTANT.ACCESS_TOKEN_SECRET,
      signOptions: { expiresIn: AUTH_CONSTANT.ACCESS_TOKEN_EXPIRY }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
