import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import ProfileUpdateRequest from 'types/request/ProfileUpdateRequest';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async searchUsers(query: string, limit: number = 20) {
        const _query = query?.trim()

        if (!_query) {
            return []
        }

        const users = await this.prisma.user.findMany({
            where: {
                OR: [
                    {
                        mobile: {
                            contains: _query,
                            mode: 'insensitive'
                        }
                    },
                    {
                        user_name: {
                            contains: _query,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            take: Number(limit) || 20,
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                user_name: true,
                Profile: true
            }
        }).then((users) => {
            return users.map((u) => ({
                user_id: u.id,
                user_name: u.user_name,
                name: u.Profile?.[0]?.display_name || "Unknown",
            }))
        })

        return { users }
    }

    async getUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                user_name: true,
                Profile: true
            }
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return {
            user_id: user.id,
            user_name: user.user_name,
            name: user.Profile?.[0]?.display_name || "Unknown",
        }
    }

    async updateProfile(profile_update_payload: ProfileUpdateRequest, _user?: User,) {
        const user = await this.prisma.user.findUnique({
            where: { id: _user?.id }
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        user.user_name = profile_update_payload.user_name || 'unknown'

        await this.prisma.user.update({
            data: user,
            where: { id: user.id }
        })

        return await this.prisma.profile.create({
            data: {
                user_id: user.id,
                display_name: profile_update_payload.display_name,
                bio: profile_update_payload.bio,
                age: profile_update_payload.age,
                avatar_url: profile_update_payload.avatar_url,
                gender: profile_update_payload.gender,
                interest: profile_update_payload.interest,
            }
        })
    }
}
