import { Controller, Get, Post, Put, Query } from '@nestjs/common';
import { KeysService } from './keys.service';

@Controller('keys')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post("publish")
  publishKeys(){

  }

  @Get('bundle')
  getKeyBundle(
    @Query('user_id') user_id: string = '',
  ) {
    return this.keysService.getKeyBundle(user_id)
  }

  @Post('mark-used')
  markKeyUsed(){

  }

  @Post('rotate-spk')
  rotateSignedPreKey(){

  }

  @Post('replenish-opk')
  replenishOneTimePreKey(){

  }

  @Put('change')
  change(
    @Query('user_id') user_id: string = '',
    @Query('otpk_id') otpk_id: string = ''
  ){
    return this.keysService.change(user_id, otpk_id)
  }
}
