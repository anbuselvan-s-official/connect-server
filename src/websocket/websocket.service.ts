import { Injectable, Logger } from '@nestjs/common'

interface QueuedMessage {
    target_id: string
    message: string
    message_id: string
    conversation_id: string
    timestamp: number
    queued_at: number
}

@Injectable()
export class WebsocketService {
    private readonly logger = new Logger(WebsocketService.name)
    private messageQueue: Map<string, QueuedMessage[]> = new Map()
    queueOfflineMessage(message: QueuedMessage) {
        const { target_id } = message

        if (!this.messageQueue.has(target_id)) {
            this.messageQueue.set(target_id, [])
        }
        const userQueue = this.messageQueue.get(target_id) || []
        userQueue.push({
            ...message,
            queued_at: Date.now(),
        })
        this.logger.log(`Message ${message.message_id} queued for user ${target_id}`)
    }
    getQueuedMessages(userId: string): QueuedMessage[] {
        return this.messageQueue.get(userId) || []
    }
    clearQueuedMessages(userId: string) {
        const count = this.messageQueue.get(userId)?.length || 0
        this.messageQueue.delete(userId)
        this.logger.log(`Cleared ${count} queued messages for user ${userId}`)
    }
    getQueueStats() {
        let totalMessages = 0
        const userCounts: Record<string, number> = {}
        for (const [userId, messages] of this.messageQueue.entries()) {
            totalMessages += messages.length
            userCounts[userId] = messages.length
        }
        return {
            totalUsers: this.messageQueue.size,
            totalMessages,
            userCounts,
        }
    }
}