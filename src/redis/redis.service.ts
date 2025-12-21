import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name)
    // private redis: Redis
    private readonly CACHE_TTL = 24 * 60 * 60 // 24 hrs in seconds

    constructor(){
        super({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryStrategy(times){
                const delay = Math.min(times * 50, 2000)
                return delay
            }
        })
    }

    onModuleInit() {
        this.on('connect', () => {
            this.logger.log('Connected to redis')
        })

        this.on('error', (error) => {
            this.logger.log('Redis Error', error)
        })
    }
    onModuleDestroy() {
        this.quit()
        this.logger.log('Redis connection closed')
    }

    // ============ CACHE METHODS ============
    async getCache(key: string){
        const cache = await this.get(key)

        if(!cache){
            this.logger.log('Cache MISS: ', key)
            return cache
        }

        const data = JSON.parse(cache)
        this.logger.log('Cache HIT: ', key, data)
        return data
    }

    async setCache(key: string, payload: string): Promise<void> {
        try {
            await this.setex(key, this.CACHE_TTL, payload)
            this.logger.log('Data cached ', payload)
        }
        catch(error) {
            this.logger.log('Error ', error)
        }
    }

    async deleteCache(key: string){
        try {
            await this.del(key)
            this.logger.log('Cache invalidated ', key)
        } catch (error) {
            this.logger.log('Error ', error)
        }
    }

    // ============ ONLINE STATUS METHODS ============
    async addOnlineUser(userId: string): Promise<void> {
        await this.sadd('online_users', userId)
        this.logger.debug(`User ${userId} marked online`)
    }

    async removeOnlineUser(userId: string): Promise<void> {
        await this.srem('online_users', userId)
        this.logger.debug(`User ${userId} marked offline`)
    }

    async isUserOnline(userId: string): Promise<boolean> {
        const result = await this.sismember('online_users', userId)
        return result === 1
    }

    async getOnlineUsers(): Promise<string[]> {
        return await this.smembers('online_users')
    }

    async getOnlineUsersCount(): Promise<number> {
        return await this.scard('online_users')
    }

    async checkMultipleUsersOnline(userIds: string[]): Promise<Map<string, boolean>> {
        const pipeline = this.pipeline()
        userIds.forEach(id => pipeline.sismember('online_users', id))
        const results = await pipeline.exec()
        
        const statusMap = new Map<string, boolean>()
        userIds.forEach((id, index) => {
            statusMap.set(id, results?.[index][1] === 1)
        })
        
        return statusMap
    }
}
