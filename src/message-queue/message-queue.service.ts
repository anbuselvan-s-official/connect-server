import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import MessagePayload from 'types/MessagePayload';

@Injectable()
export class MessageQueueService {
    private readonly logger = new Logger(MessageQueueService.name)
    private readonly QUEUE_TTL = 86400 // 24 hours

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) {}

    async enqueueMessage(payload: MessagePayload): Promise<void> {
        try {
            const conversation_id = await this.getOrCreateConversationId(
                payload.sender.id,
                payload.receiver.id
            )

            // 1. Write to Redis first (fast)
            const redis_key = `message_queue:${payload.receiver.id}`
            await this.redis.rpush(redis_key, JSON.stringify(payload))
            await this.redis.expire(redis_key, this.QUEUE_TTL)

            // 2. Write to PostgreSQL (persistent backup)
            await this.prisma.queuedMessage.create({
                data: {
                    conversation_id: conversation_id,
                    sender_id: payload.sender.id,
                    receiver_id: payload.receiver.id,
                    payload: JSON.stringify(payload.payload),
                    device_id: payload.receiver.device_id,
                    timestamp: BigInt(payload.timestamp)
                }
            })

            this.logger.log(`📦 Message queued: ${payload.receiver.id} (Redis + PostgreSQL)`)
        } catch (error) {
            this.logger.error('Failed to enqueue message', error)
            throw error
        }
    }

    async getQueuedMessages(user_id: string): Promise<MessagePayload[]> {
        try {
            const redis_key = `message_queue:${user_id}`
            
            // 1. Try Redis first (2ms)
            const cached_messages = await this.redis.lrange(redis_key, 0, -1)
            
            if (cached_messages && cached_messages.length > 0) {
                this.logger.log(`✅ Retrieved ${cached_messages.length} messages from Redis for ${user_id}`)
                return cached_messages.map(msg => JSON.parse(msg))
            }

            // 2. Fallback to PostgreSQL (40ms)
            this.logger.log(`⚠️ Redis miss, fetching from PostgreSQL for ${user_id}`)
            const db_messages = await this.prisma.queuedMessage.findMany({
                where: { receiver_id: user_id },
                orderBy: { created_at: 'asc' }
            })

            if (db_messages.length === 0) {
                this.logger.log(`✅ No queued messages for ${user_id}`)
                return []
            }

            // 3. Convert to MessagePayload format
            const messages: MessagePayload[] = db_messages.map(msg => ({
                sender: {
                    id: msg.sender_id,
                    device_id: msg.device_id
                },
                receiver: {
                    id: msg.receiver_id,
                    device_id: msg.device_id
                },
                payload: JSON.parse(msg.payload),
                device_id: msg.device_id,
                timestamp: Number(msg.timestamp)
            }))

            // 4. Restore to Redis for next time
            if (messages.length > 0) {
                const pipeline = this.redis.pipeline()
                messages.forEach(msg => {
                    pipeline.rpush(redis_key, JSON.stringify(msg))
                })
                pipeline.expire(redis_key, this.QUEUE_TTL)
                await pipeline.exec()
                this.logger.log(`♻️ Restored ${messages.length} messages to Redis for ${user_id}`)
            }

            this.logger.log(`✅ Retrieved ${messages.length} messages from PostgreSQL for ${user_id}`)
            return messages
        } catch (error) {
            this.logger.error(`Failed to get queued messages for ${user_id}`, error)
            return []
        }
    }

    async clearQueue(conversationId: string): Promise<void> {
        try {
            // 1. Delete from PostgreSQL
            const deleted = await this.prisma.queuedMessage.deleteMany({
                where: { conversation_id: conversationId }
            })

            this.logger.log(`🗑️ Cleared ${deleted.count} messages from PostgreSQL for conversation ${conversationId}`)
        } catch (error) {
            this.logger.error(`Failed to clear queue for ${conversationId}`, error)
        }
    }

    async clearUserQueue(userId: string): Promise<void> {
        try {
            const redis_key = `message_queue:${userId}`
            
            // 1. Delete from Redis
            await this.redis.del(redis_key)

            // 2. Delete from PostgreSQL
            const deleted = await this.prisma.queuedMessage.deleteMany({
                where: { receiver_id: userId }
            })

            this.logger.log(`🗑️ Cleared ${deleted.count} messages for user ${userId} (Redis + PostgreSQL)`)
        } catch (error) {
            this.logger.error(`Failed to clear queue for user ${userId}`, error)
        }
    }

    async getQueueCount(conversationId: string): Promise<number> {
        try {
            // Try PostgreSQL (more accurate for conversation-specific count)
            const count = await this.prisma.queuedMessage.count({
                where: { conversation_id: conversationId }
            })
            return count
        } catch (error) {
            this.logger.error(`Failed to get queue count for ${conversationId}`, error)
            return 0
        }
    }

    async getUserQueueCount(userId: string): Promise<number> {
        try {
            const redis_key = `message_queue:${userId}`
            
            // 1. Try Redis first (1ms)
            const count = await this.redis.llen(redis_key)
            
            if (count > 0) {
                this.logger.debug(`✅ Queue count from Redis: ${userId} = ${count}`)
                return count
            }

            // 2. Fallback to PostgreSQL (20ms)
            this.logger.debug(`⚠️ Redis miss, counting in PostgreSQL: ${userId}`)
            const dbCount = await this.prisma.queuedMessage.count({
                where: { receiver_id: userId }
            })

            this.logger.debug(`✅ Queue count from PostgreSQL: ${userId} = ${dbCount}`)
            return dbCount
        } catch (error) {
            this.logger.error(`Failed to get queue count for user ${userId}`, error)
            return 0
        }
    }

    private async getOrCreateConversationId(userId1: string, userId2: string): Promise<string> {
        const [alice_id, bob_id] = [userId1, userId2].sort()

        let conversation = await this.prisma.conversation.findUnique({
            where: { alice_id_bob_id: { alice_id, bob_id } }
        })

        if (conversation) {
            return conversation.id
        }

        conversation = await this.prisma.conversation.create({
            data: { alice_id, bob_id, last_message_at: new Date() }
        })

        return conversation.id
    }

    async cleanupOldMessages(): Promise<void> {
        try {
            const oneDayAgo = new Date(Date.now() - 86400000)
            
            const deleted = await this.prisma.queuedMessage.deleteMany({
                where: { created_at: { lt: oneDayAgo } }
            })

            if (deleted.count > 0) {
                this.logger.log(`🧹 Cleaned up ${deleted.count} old messages from PostgreSQL`)
            }
        } catch (error) {
            this.logger.error('Failed to cleanup old messages', error)
        }
    }
}
