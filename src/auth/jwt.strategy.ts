import { PassportStrategy } from '@nestjs/passport'
import { AUTH_CONSTANT } from 'constants/AuthConstant'
import { ExtractJwt, Strategy } from 'passport-jwt'

export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: AUTH_CONSTANT.ACCESS_TOKEN_SECRET,
    })
  }

  validate(payload: { sub: string }) {
    return { id: payload.sub }
  }
}
