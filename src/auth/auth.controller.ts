import { Body, Controller, Headers, Post, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import { ApiProperty } from '@nestjs/swagger'
import RequestOtpRequest from 'types/request/RequestOtpRequest';
import VerifyOtpRequest from 'types/request/VerifyOtpRequest';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() body: RequestOtpRequest) {
    return this.authService.requestOtp(body.mobile_number);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyOtpRequest) {
    return this.authService.verifyOtp(body.mobile_number, body.otp);
  }

  @Post('refresh')
  async refreshToken(@Headers('x-refresh-token') refresh_token: string){
    return this.authService.refreshTokens(refresh_token)
  }
}
