import { Module } from '@nestjs/common';
import { MessageQueueService } from './message-queue.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule], 
  providers: [MessageQueueService],
  exports: [MessageQueueService]
})
export class MessageQueueModule {}
