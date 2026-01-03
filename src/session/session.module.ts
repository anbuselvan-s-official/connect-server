import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}
