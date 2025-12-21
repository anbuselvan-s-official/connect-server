import { Module } from '@nestjs/common'
import { WebsocketService } from './websocket.service'
import { WebsocketGateway } from './websocket.gateway'
import { PrismaModule } from 'src/prisma/prisma.module'
import { UsersModule } from 'src/users/users.module'
import { RedisModule } from 'src/redis/redis.module'
import { ConversationModule } from 'src/conversation/conversation.module'

@Module({
  imports: [PrismaModule, UsersModule, RedisModule, ConversationModule],
  providers: [WebsocketGateway, WebsocketService],
})
export class WebsocketModule {}
