import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { RegisterationService } from './registeration.service'
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'
import { ApiAuthHeader } from 'utils/ApiAuthHeader'
import type PublishKeyBundleRequest from 'types/request/PublishKeyBundleRequest'

@Controller('/v1/onboarding')
@UseGuards(JwtAuthGuard)
@ApiAuthHeader()
export class RegisterationController {
  constructor(private readonly registerationService: RegisterationService) {}

  @Post('register')
  async register(@Body() body: PublishKeyBundleRequest){
    return body
  }

  @Get('/')
  async get(){
    return { message: 'Hellow' }
  }

  @Post('publish-keys')
  async publishKeys(@Body() body: PublishKeyBundleRequest){
    return await this.registerationService.publishKeys(body)
  }
}
