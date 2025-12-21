import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name)
    
    constructor(private readonly prisma: PrismaService, private readonly redis: RedisService){}

    async broadCastOnlineStatus(user_id: string){
        const cached = await this.getCachedConversationPartners(user_id)
        if (cached) {
            this.logger.debug(`Cache HIT for partners:${user_id} (${cached.length} partners)`)
            return cached.slice(0, 50) // Ensure max 50
        }

        // Query database
        this.logger.debug(`Cache MISS for partners:${user_id}, querying database`)

        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { alice_id: user_id },
                    { bob_id: user_id }
                ]
            },
            orderBy: {
                last_message_at: 'desc'
            },
            take: 50,
            select: {
                alice_id: true,
                bob_id: true
            }
        })

        const partner_ids = conversations.map(conversation => conversation.alice_id == user_id ? conversation.bob_id : conversation.alice_id)

        // Set cache
        if (partner_ids.length > 0) {
            await this.cacheConversationPartners(user_id, partner_ids)
        }

        this.logger.debug(`Found ${partner_ids.length} conversation partners for user ${user_id}`)
        return partner_ids
    }

    /**
     * Update or create conversation record when message is sent
     * This tracks who has chatted with whom
     */
    async updateConversation(user_a_id: string, user_b_id: string): Promise<void> {
        try {
            // Ensure consistent ordering (smaller ID first for alice)
            const [alice_id, bob_id] = [user_a_id, user_b_id].sort()

            await this.prisma.conversation.upsert({
                where: {
                    alice_id_bob_id: {
                        alice_id,
                        bob_id
                    }
                },
                update: {
                    last_message_at: new Date()
                },
                create: {
                    alice_id,
                    bob_id,
                    last_message_at: new Date()
                }
            })

            // Invalidate cache for both users so next query gets fresh data
            await this.invalidateConversationPartnersCache(user_a_id)
            await this.invalidateConversationPartnersCache(user_b_id)

            this.logger.debug(`Updated conversation between ${user_a_id} and ${user_b_id}`)
        } catch (error) {
            this.logger.error(`Failed to update conversation: ${error.message}`)
        }
    }

    async updateLastSeen(user_id: string, last_seen: Date = new Date()){
        await this.prisma.profile.updateMany({
            where: { user_id: user_id },
            data: { last_seen: last_seen }
        })
        this.logger.debug(`Updated last_seen for user ${user_id}`)
    }

    private async cacheConversationPartners(user_id: string, partner_ids: string[]){
        const key = `partners:${user_id}`
        await this.redis.del(key)

        if(partner_ids.length){
            await this.redis.sadd(key, ...partner_ids)
            await this.redis.expire(key, 3600)
        }

        this.logger.log(`Cached ${partner_ids.length} partners for user ${user_id}`)
    }

    private async getCachedConversationPartners(user_id: string): Promise<string[] | null> {
        const key = `partners:${user_id}`
        const exists = await this.redis.exists(key)
        if (!exists) return null
        
        return await this.redis.smembers(key)
    }

    async invalidateConversationPartnersCache(user_id: string): Promise<void> {
        await this.redis.del(`partners:${user_id}`)
        this.logger.debug(`Invalidated partners cache for user ${user_id}`)
    }
}
