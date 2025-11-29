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

interface MessagePayload {
  target_id: string
  message: string // Encrypted message JSON
  message_id: string
  conversation_id: string
  timestamp: number
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  websocketServer: Server
  
  private readonly logger = new Logger(WebsocketGateway.name)
  private clients = new Map<string, string>() // userId -> socketId
  
  constructor(private readonly websocketService: WebsocketService) {}
  
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
    const user_id = client.handshake.query.user_id as string
    
    if (user_id && user_id !== 'null' && user_id !== 'undefined') {
      this.clients.set(user_id, client.id)
      this.logger.log(`User ${user_id} mapped to socket ${client.id}`)
      this.logger.log(`Total connected users: ${this.clients.size}`)
    } 
    else {
      this.logger.warn(`Client ${client.id} connected without user_id`)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    
    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId)
        this.logger.log(`User ${userId} disconnected`)
        break
      }
    }
    this.logger.log(`Total connected users: ${this.clients.size}`)
  }

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized')
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: string) {
    try {
      const messageData: MessagePayload = JSON.parse(payload)
      this.logger.log(`Message received from ${client.id}`)
      this.logger.debug(`Payload: ${JSON.stringify(messageData)}`)
      
      const { target_id, message, message_id, conversation_id, timestamp } = messageData
      
      if (!target_id || !message || !message_id || !conversation_id) {
        this.logger.error('Invalid message payload')
        client.emit('error', {
          error: 'Invalid message format',
          message_id: message_id || 'unknown',
        })
        return
      }
      const target_socket_id = this.clients.get(target_id)
      
      if (target_socket_id) {
        this.websocketServer.to(target_socket_id).emit('message', payload)
        
        this.logger.log(
          `Message ${message_id} forwarded to ${target_id}`
        )
        client.emit('message_sent', {
          message_id,
          status: 'delivered',
          timestamp: Date.now(),
        })
      } 
      else {
        this.logger.warn(`User ${target_id} offline - message ${message_id} pending`)
        
        client.emit('message_sent', {
          message_id,
          status: 'pending',
          timestamp: Date.now(),
          error: 'Recipient offline',
        })
      }
      return { event: 'message', data: messageData }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`)
      client.emit('error', {
        error: 'Failed to process message',
        details: error.message,
      })
    }
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(client: Socket) {
    const onlineUsers = Array.from(this.clients.keys())
    client.emit('online_users', onlineUsers)
    return { event: 'online_users', data: onlineUsers }
  }

  isUserOnline(userId: string): boolean {
    return this.clients.has(userId)
  }

  sendMessageToUser(userId: string, event: string, data: any) {
    const socketId = this.clients.get(userId)
    if (socketId) {
      this.websocketServer.to(socketId).emit(event, data)
      return true
    }
    return false
  }
}