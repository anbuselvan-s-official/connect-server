import { Injectable, Logger } from '@nestjs/common';
import { Session } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name)
    private readonly SESSION_KEY = 'session'

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) {}

    async lockSession(session_id: string, locked_by: string, reason: string = 'OFFLINE_RECIPIENT'){
        try {
            const lock_data = {
                locked_by: locked_by,
                locked_at: new Date().toISOString(),
                reason: reason
            }

            // 1. Write to Redis first (fast)
            const redisKey = `${this.SESSION_KEY}_lock:${session_id}`
            await this.redis.set(redisKey, JSON.stringify(lock_data))

            // 2. Write to PostgreSQL (persistent backup)
            await this.prisma.session.upsert({
                where: { id: session_id },
                update: { 
                    locked_by: locked_by, 
                    locked_at: new Date(),
                    reason: reason 
                },
                create: {
                    id: session_id,
                    locked_by: locked_by,
                    locked_at: new Date(),
                    reason: reason
                }
            })

            this.logger.log(`🔒 Session locked: ${session_id} by ${locked_by}`)
        } catch (error) {
            this.logger.error(`Failed to lock session ${session_id}`, error)
            throw error
        }
    }

    async releaseSession(session_id: string){
        try {
            // 1. Remove from Redis (fast)
            const redisKey = `${this.SESSION_KEY}_lock:${session_id}`
            await this.redis.del(redisKey)

            // 2. Remove from PostgreSQL
            await this.prisma.session.delete({
                where: { id: session_id }
            }).catch(() => {
                this.logger.debug(`Session lock not found in DB: ${session_id}`)
            })

            this.logger.log(`🔓 Session unlocked: ${session_id}`)
        } catch (error) {
            this.logger.error(`Failed to unlock session ${session_id}`, error)
        }
    }

    async getSession(session_id: string): Promise<Session | undefined> {
        try {
            const redisKey = `${this.SESSION_KEY}_lock:${session_id}`
            
            // 1. Try Redis first (1ms)
            const cached = await this.redis.get(redisKey)
            if (cached) {
                this.logger.debug(`✅ Lock check (Redis): ${session_id} - LOCKED`)
                return JSON.parse(cached)
            }

            // 2. Fallback to PostgreSQL (20ms)
            this.logger.debug(`⚠️ Redis miss, checking PostgreSQL: ${session_id}`)
            
            const session = await this.prisma.session.findUnique({
                where: { id: session_id }
            })

            // 3. If found in DB, restore to Redis
            if (session) {
                await this.redis.set(redisKey, JSON.stringify(session))
                this.logger.debug(`♻️ Restored lock to Redis: ${session_id}`)
                return session
            }

            this.logger.debug(`✅ Lock check (PostgreSQL): ${session_id} - NOT LOCKED`)
            return
        } catch (error) {
            this.logger.error(`Failed to check lock for ${session_id}`, error)
            return
        }
    }
}
