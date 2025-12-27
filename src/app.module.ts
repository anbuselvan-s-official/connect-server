import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RegisterationModule } from './registeration/registeration.module'
import { WebsocketModule } from './websocket/websocket.module'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './keys/keys.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RedisModule } from './redis/redis.module';
import { ConversationModule } from './conversation/conversation.module'
import { SessionModule } from './session/session.module';
import { MessageQueueModule } from './message-queue/message-queue.module';

@Module({
  imports: [
    RegisterationModule, 
    WebsocketModule, 
    AuthModule, 
    PrismaModule, 
    KeysModule, 
    UsersModule, 
    AnalyticsModule, 
    RedisModule,
    ConversationModule,
    SessionModule,
    MessageQueueModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
