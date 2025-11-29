import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import PreKeyBundleResponse from 'types/response/PreKeyBundleResponse';

@Injectable()
export class KeysService {
    constructor(private readonly prisma: PrismaService) { }

    async getKeyBundle(user_id: string): Promise<PreKeyBundleResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: user_id }
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        const signed_pre_key = (await this.prisma.signedPreKey.findMany({
            where: { user_id: user.id }
        }))[0]

        const one_time_pre_key = (await this.prisma.oneTimePreKey.findMany({
            where: { user_id: user.id, is_used: false }
        }))[0]

        const response = {
            user_id: user.id,
            device_id: user.id,
            registration_id: user.id,
            public_key: Array.from(Buffer.from(user.public_key as Uint8Array<ArrayBufferLike>)),
            signed_pre_key: {
                key_id: signed_pre_key.id,
                public_key: Array.from(Buffer.from(signed_pre_key.public_key)),
                signature: Array.from(Buffer.from(signed_pre_key.signature)),
                expires_at: signed_pre_key.expires_at
            },
            one_time_pre_key: {
                key_id: one_time_pre_key.key_id,
                public_key: Array.from(Buffer.from(one_time_pre_key.public_key)),
                is_used: one_time_pre_key.is_used
            }
        }

        return response
    }


    async change(user_id: string, otpk_id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: user_id }
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        const one_time_pre_key = await this.prisma.oneTimePreKey.findUnique({ where: { key_id: otpk_id } })

        if(!one_time_pre_key){
            throw new NotFoundException('One time pre key id is not found')
        }

        return await this.prisma.oneTimePreKey.update({
            where: { key_id: otpk_id },
            data: {
                ...one_time_pre_key,
                is_used: true
            }
        })
    }
}
