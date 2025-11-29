import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { User } from "@prisma/client";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = User>(err?: Error, user?: User, info?: any, context?: ExecutionContext, status?: any): TUser {
    if (err || !user) {
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }
      throw err || new UnauthorizedException('Unauthorized');
    }
    return user as any
  }
}