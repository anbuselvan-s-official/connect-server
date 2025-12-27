import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { User } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { ConversationService } from 'src/conversation/conversation.service'
import { MessageQueueService } from 'src/message-queue/message-queue.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { SessionService } from 'src/session/session.service'
import { UsersService } from 'src/users/users.service'
import { ActivityStatusEvent } from 'types/ActivityStatus'
import type MessagePayload from 'types/MessagePayload'
import { SocketAcknowledge, SocketAckResponse } from 'types/response/SocketAckResponse'
import { DeviceMismatchException, SelfMessagingException, SessionLockedException } from './exceptions'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class WebsocketService {
    constructor(private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly users: UsersService,
        private readonly conversation: ConversationService,
        private readonly session: SessionService,
        private readonly messageQueue: MessageQueueService
    ) { }

    private websocketServer: Server

    private readonly logger = new Logger(WebsocketService.name)
    private clients = new Map<string, { user: User, socket_id: string }>()

    setServer(server: Server) {
        this.websocketServer = server
    }

    async handleConnection(socket: Socket) {
        const user_id = socket.handshake.query.user_id as string
        const user = await this.prisma.user.findUnique({ where: { id: user_id } })

        if (user) {
            await this.redis.addOnlineUser(user_id)
            this.clients.set(user_id, { user, socket_id: socket.id })
            this.logger.log(`Connected - ${user.user_name} | socket_id: ${socket.id}`)

            // Check for queued messages (Redis first, PostgreSQL fallback)
            const queuedMessages = await this.messageQueue.getQueuedMessages(user_id)

            if (queuedMessages.length > 0) {
                this.logger.log(`📦 Delivering ${queuedMessages.length} queued messages to ${user.user_name}`)

                // Group messages by conversation
                const conversations = new Map<string, MessagePayload[]>()

                for (const message of queuedMessages) {
                    const conversation_id = await this.getConversationId(message.sender.id, message.receiver.id)
                    if (!conversations.has(conversation_id)) {
                        conversations.set(conversation_id, [])
                    }
                    conversations.get(conversation_id)!.push(message)
                }

                // Send queued messages
                for (const message of queuedMessages) {
                    this.websocketServer.to(socket.id).emit('message', JSON.stringify({
                        ...message,
                        is_queued: true
                    }))
                    await new Promise(resolve => setTimeout(resolve, 50))
                }

                // ✅ Unlock sessions and clear queues with proper error handling
                for (const [conversation_id] of conversations) {
                    try {
                        await this.session.releaseSession(conversation_id)
                        await this.messageQueue.clearQueue(conversation_id)
                        this.logger.log(`🔓 Session unlocked and queue cleared for ${conversation_id}`)
                    } catch (error) {
                        this.logger.error(`❌ Failed to unlock session ${conversation_id}`, error)
                        // ✅ Continue with other sessions even if one fails
                    }
                }

                // Clear user queue
                try {
                    await this.messageQueue.clearUserQueue(user_id)
                } catch (error) {
                    this.logger.error(`❌ Failed to clear user queue for ${user_id}`, error)
                }
            }

            await this.broadcastPresence(user_id, true)
        }
        this.logClients()
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
        this.logClients()
    }

    async onMessage(socket: Socket, messagePayload: string): Promise<SocketAckResponse> {
        this.logClients()
    
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)
        const receiver = this.clients.get(payload.receiver.id)
    
        if (sender?.user.id === receiver?.user.id) {
            this.logger.warn(`Self-messaging attempt by user ${sender?.user.id}`)
            throw new SelfMessagingException()  // ✅ Let it bubble up
        }
    
        const conversation_id = await this.getConversationId(sender!.user.id, payload.receiver.id)
        const session = await this.session.getSession(conversation_id)
    
        if (session && session.locked_by !== sender!.user.id) {
            const queueCount = await this.messageQueue.getQueueCount(conversation_id)
            this.logger.warn(`🔒 Message rejected - session locked by ${session.locked_by}`)
            throw new SessionLockedException(session.locked_by, queueCount)  // ✅ Let it bubble up
        }
    
        if (!receiver) {
            await this.session.lockSession(conversation_id, sender!.user.id, 'OFFLINE_RECIPIENT')
            await this.messageQueue.enqueueMessage(payload)
            this.logger.log(`📦 Message queued for offline user ${payload.receiver.id}`)
            await this.conversation.updateConversation(sender!.user.id, payload.receiver.id)
                .catch(err => this.logger.error('Failed to update conversation', err))
    
            return {
                code: 202,
                status: SocketAcknowledge.QUEUED,
                reason: 'Recipient is offline. Message queued for delivery.'
            }
        }
    
        const recipientUser = await this.users.getUser(receiver.user.id)
    
        if (payload.receiver.device_id !== recipientUser.device_id) {
            this.logger.warn(`Device ID mismatch: expected ${recipientUser.device_id}, got ${payload.receiver.device_id}`)
            throw new DeviceMismatchException(recipientUser.device_id, payload.receiver.device_id)  // ✅ Let it bubble up
        }
    
        this.websocketServer.to(receiver.socket_id).emit('message', JSON.stringify(payload))
        this.logger.log(`📨 Message delivered: ${sender?.user.user_name} → ${receiver.user.user_name}`)
        await this.conversation.updateConversation(sender!.user.id, receiver.user.id)
            .catch(err => this.logger.error('Failed to update conversation', err))
    
        return {
            code: 200,
            status: SocketAcknowledge.DELIVERED,
            reason: 'Message delivered successfully'
        }
    }
    

    onError(socket: Socket, messagePayload: string) {
        this.logClients(this.onError.name)
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)
        const receiver = this.clients.get(payload.receiver.id)

        if (receiver) {
            this.websocketServer.to(receiver.socket_id).emit('error', JSON.stringify(payload))
            this.logger.log(`onError - from: ${JSON.stringify(sender?.user)} | to: ${JSON.stringify(receiver.user)} | message: ${messagePayload}`)
        }
    }

    onActivity(socket: Socket, status_payload: string) {
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

    async broadcastPresence(user_id: string, status: boolean) {
        const partners = await this.conversation.broadCastOnlineStatus(user_id)

        if (!partners || partners.length == 0) {
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

    private async getConversationId(userId1: string, userId2: string): Promise<string> {
        const [alice_id, bob_id] = [userId1, userId2].sort()

        const conversation = await this.prisma.conversation.findUnique({
            where: { alice_id_bob_id: { alice_id, bob_id } }
        })

        if (conversation) {
            return conversation.id
        }

        const newConversation = await this.prisma.conversation.create({
            data: { alice_id, bob_id, last_message_at: new Date() }
        })

        return newConversation.id
    }

    private logClients(message?: string) {
        this.logger.log(message ?? WebsocketService.name, 'Clients : ' + Array.from(this.clients.values()).map(client => client.user.user_name))
    }
}