import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'

import { WebsocketService } from './websocket.service'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{ 
  private readonly logger = new Logger(WebsocketGateway.name)
  constructor(private readonly websocketService: WebsocketService) {}

  handleConnection(client: Socket) {
    return this.websocketService.handleConnection(client)
  }

  handleDisconnect(client: Socket) {
    return this.websocketService.handleDisconnection(client)
  }

  afterInit(server: Server) {
    this.websocketService.setServer(server)
    this.logger.log('WebSocket Gateway Initialized')
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, _payload: string) {
    return this.websocketService.onMessage(client, _payload)
  }

  @SubscribeMessage('error')
  handleError(client: Socket, _payload: string) {
    return this.websocketService.onError(client, _payload)
  }

  @SubscribeMessage('activity_status')
  async handleActivityStatus(client: Socket, payload: string){
    return this.websocketService.onActivity(client, payload)
  }
}