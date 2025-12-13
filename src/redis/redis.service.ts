import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name)
    private redis: Redis
    private readonly CACHE_TTL = 24 * 60 * 60 // 24 hrs in seconds


    onModuleInit() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryStrategy(times){
                const delay = Math.min(times * 50, 2000)
                return delay
            }
        })

        this.redis.on('connect', () => {
            this.logger.log('Connected to redis')
        })

        this.redis.on('error', (error) => {
            this.logger.log('Redis Error', error)
        })
    }
    onModuleDestroy() {
        this.redis.quit()
        this.logger.log('Redis connection closed')
    }

    async getCache(key: string){
        const cache = await this.redis.get(key)

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
            await this.redis.setex(key, this.CACHE_TTL, payload)
            this.logger.log('Data cached ', payload)
        }
        catch(error) {
            this.logger.log('Error ', error)
        }
    }

    async deleteCache(key: string){
        try {
            await this.redis.del(key)
            this.logger.log('Cache invalidated ', key)
        } catch (error) {
            this.logger.log('Error ', error)
        }
    }
}
