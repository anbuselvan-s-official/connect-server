import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [ConversationService],
    exports: [ConversationService]
})
export class ConversationModule { }
