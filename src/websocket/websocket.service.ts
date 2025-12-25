import { Injectable, Logger } from '@nestjs/common'
import { User } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { ConversationService } from 'src/conversation/conversation.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { UsersService } from 'src/users/users.service'
import { ActivityStatusEvent } from 'types/ActivityStatus'
import type MessagePayload from 'types/MessagePayload'

@Injectable()
export class WebsocketService {
    constructor(private readonly prisma: PrismaService, 
        private readonly redis: RedisService, 
        private readonly users: UsersService,
        private readonly conversation: ConversationService
    ) { }

    private websocketServer: Server

    private readonly logger = new Logger(WebsocketService.name)
    private clients = new Map<string, { user: User, socket_id: string}>()

    setServer(server: Server){
        this.websocketServer = server
    }

    async handleConnection(socket: Socket) {
        const user_id = socket.handshake.query.user_id as string
        const user = await this.prisma.user.findUnique({ where: { id: user_id } })

        if (user) {
            await this.redis.addOnlineUser(user_id)
            this.clients.set(user_id, { user, socket_id: socket.id })
            this.logger.log(`Connected - ${user.user_name} | socket_id: ${socket.id}`)

            // Broadcast online status to top 50 conversation partners
            await this.broadcastPresence(user_id, true)
        }
        this.logger.log(this.handleConnection.name, Array.from(this.clients.values()).map(client => ({ name: client.user.user_name, id: client.user.id, socket: client.socket_id})))
    }

    async handleDisconnection(socket: Socket) {
        const user_id = socket.handshake.query.user_id as string
        const client = this.clients.get(user_id)

        if (client) {
            this.redis.removeOnlineUser(user_id)
            this.clients.delete(user_id)
            this.logger.log(`Disonnected - ${client.user.user_name} | socket_id: ${socket.id}`)

            await this.conversation.updateLastSeen(user_id)

            // Broadcast offline status to top 50 conversation partners
            await this.broadcastPresence(user_id, false)
        }
        this.logger.log(this.handleDisconnection.name, Array.from(this.clients.values()).map(client => ({ name: client.user.user_name, id: client.user.id, socket: client.socket_id})))
    }

    async onMessage(socket: Socket, messagePayload: string) {
        this.logger.log(this.onMessage.name, Array.from(this.clients.values()).map(client => ({ name: client.user.user_name, id: client.user.id, socket: client.socket_id})))
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)!!
        const receiver = this.clients.get(payload.receiver.id)

        if(sender?.user.id == receiver?.user.id){
            this.logger.warn(`Self-messaging attempt by user ${sender?.user.id}`)
            return
        }
        
        if (receiver) {
            const receipient_user = await this.users.getUser(receiver?.user.id || '')

            if(payload.receiver.device_id === receipient_user.device_id){
                this.websocketServer.to(receiver.socket_id).emit('message', JSON.stringify(payload))
                this.logger.log(`📨 Message: ${sender?.user.user_name} → ${receiver.user.user_name}`)

                this.conversation.updateConversation(sender.user.id, receiver.user.id)
                        .catch(err => this.logger.error('Failed to update conversation', err))
            }
            else {
                payload.payload = 'DEVICE_ID_MISMATCH'
                socket.emit('error', JSON.stringify(payload))
                this.logger.warn(`Device ID mismatch: expected ${receipient_user.device_id}, got ${payload.device_id}`)
            }
        }
    }

    onError(socket: Socket, messagePayload: string) {
        this.logger.log(this.onError.name, Array.from(this.clients.values()).map(client => ({ name: client.user.user_name, id: client.user.id, socket: client.socket_id})))
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)
        const receiver = this.clients.get(payload.receiver.id)

        if (receiver) {
            this.websocketServer.to(receiver.socket_id).emit('error', JSON.stringify(payload))
            this.logger.log(`onError - from: ${JSON.stringify(sender?.user)} | to: ${JSON.stringify(receiver.user)} | message: ${messagePayload}`)
        }
    }

    onActivity(socket: Socket, status_payload: string){
        try {
            const payload: ActivityStatusEvent = JSON.parse(status_payload)
            const sender = this.clients.get(socket.handshake.query.user_id as string)
            const recipient = this.clients.get(payload.recipient_id)
    
            if (!sender) {
                this.logger.warn('Activity status from unknown sender')
                return
            }
    
            this.logger.debug(
                `Activity status: ${sender.user.user_name} → ${payload.status} (to ${payload.recipient_id})`
            )
    
            // Send status to recipient if they're online
            if (recipient) {
                this.websocketServer
                    .to(recipient.socket_id)
                    .emit('activity_status', status_payload)
                
                this.logger.debug(
                    `Forwarded activity status to ${recipient.user.user_name}`
                )
            } else {
                this.logger.debug(
                    `Recipient ${payload.recipient_id} is offline, status not sent`
                )
            }
        } catch (error) {
            this.logger.error(`Error processing activity status: ${error.message}`)
        }
    }

    async broadcastPresence(user_id: string, status: boolean){
        const partners = await this.conversation.broadCastOnlineStatus(user_id)

        if(!partners || partners.length == 0){
            this.logger.debug(`No conversation partners found for user ${user_id}`)
            return
        }

        this.logger.log(`Broadcasting ${status} for user ${user_id} to ${partners.length} partners`)

        const payload = {
            user_id: user_id,
            status: status,
            timestamp: Date.now(),
            ...(!status && { last_seen: Date.now() })
        }

        let broadcast_count = 0

        // Send to each partner who is currently online
        for (const partner_id of partners) {
            const client = this.clients.get(partner_id)
            if (client) {
                this.websocketServer
                    .to(client.socket_id)
                    .emit('presence', payload)
                broadcast_count++
            }
        }

        this.logger.log(`Presence broadcast sent to ${broadcast_count}/${partners.length} online partners`)
    }
}