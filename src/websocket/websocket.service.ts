import { Injectable, Logger } from '@nestjs/common'
import { User } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { PrismaService } from 'src/prisma/prisma.service'
import { UsersService } from 'src/users/users.service'
import type MessagePayload from 'types/MessagePayload'

@Injectable()
export class WebsocketService {
    constructor(private readonly prisma: PrismaService, private readonly users: UsersService) { }

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
            this.clients.set(user_id, { user, socket_id: socket.id })
            this.logger.log(`Connected - ${JSON.stringify(user)} | socket_id: ${socket.id}`)
        }
    }

    handleDisconnection(socket: Socket) {
        const user_id = socket.handshake.query.user_id as string
        const client = this.clients.get(user_id)

        if (client) {
            this.clients.delete(user_id)
            this.logger.log(`Disconnected - ${JSON.stringify(client)}`)
        }
    }

    async onMessage(socket: Socket, messagePayload: string) {
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)
        const receiver = this.clients.get(payload.receiver.id)
        
        if (receiver) {
            const receipient_user = await this.users.getUser(receiver?.user.id || '')

            if(payload.receiver.device_id === receipient_user.device_id){
                this.websocketServer.to(receiver.socket_id).emit('message', JSON.stringify(payload))
                this.logger.log(`onMessage - from: ${JSON.stringify(sender?.user)} | to: ${JSON.stringify(receiver.user)} | message: ${messagePayload}`)
            }
            else {
                payload.payload = 'DEVICE_ID_MISMATCH'
                socket.emit('error', JSON.stringify(payload))
                this.logger.warn(`Device ID mismatch: expected ${receipient_user.device_id}, got ${payload.device_id}`)
            }
        }
    }

    onError(socket: Socket, messagePayload: string) {
        const payload: MessagePayload = JSON.parse(messagePayload)
        const sender = this.clients.get(socket.handshake.query.user_id as string)
        const receiver = this.clients.get(payload.receiver.id)

        if (receiver) {
            this.websocketServer.to(receiver.socket_id).emit('error', JSON.stringify(payload))
            this.logger.log(`onError - from: ${JSON.stringify(sender?.user)} | to: ${JSON.stringify(receiver.user)} | message: ${messagePayload}`)
        }
    }
}