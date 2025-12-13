import { Module } from '@nestjs/common'
import { WebsocketService } from './websocket.service'
import { WebsocketGateway } from './websocket.gateway'
import { PrismaModule } from 'src/prisma/prisma.module'
import { UsersModule } from 'src/users/users.module'

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [WebsocketGateway, WebsocketService],
})
export class WebsocketModule {}
