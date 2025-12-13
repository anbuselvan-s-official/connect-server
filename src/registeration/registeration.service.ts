import { Injectable, NotFoundException } from '@nestjs/common'
import { SignedPreKey } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import PublishKeyBundleRequest from 'types/request/PublishKeyBundleRequest';

@Injectable()
export class RegisterationService {
    constructor(private readonly prisma: PrismaService) {}
    
    async publishKeys(prekeyBundle: PublishKeyBundleRequest){
        const { signed_pre_key, one_time_pre_key } = prekeyBundle
        let user = await this.prisma.user.findUnique({ where: { mobile: prekeyBundle.mobile_number } })

        if(!user) {
            throw new NotFoundException({ message: 'User not found' })
        } 
        
        user = await this.prisma.user.update({
            where: { mobile: prekeyBundle.mobile_number },
            data: {
                public_key: Buffer.from(prekeyBundle.public_key, 'base64')
            }
        })

        let _signed_pre_key: (SignedPreKey | null) = await this.prisma.signedPreKey.findFirst({ where: { user_id: user.id }})

        if(!_signed_pre_key){
            _signed_pre_key = await this.prisma.signedPreKey.create({
                data: {
                    expires_at: new Date(signed_pre_key.expires_at),
                    public_key: Buffer.from(signed_pre_key.public_key, 'base64'),
                    signature: Buffer.from(signed_pre_key.signature, 'base64'),
                    user_id: user.id
                }
            })
        } else {
            await this.prisma.signedPreKey.update({
                data: {
                    expires_at: new Date(signed_pre_key.expires_at),
                    public_key: Buffer.from(signed_pre_key.public_key, 'base64'),
                    signature: Buffer.from(signed_pre_key.signature, 'base64'),
                    user_id: user.id
                },
                where: { id: _signed_pre_key.id }
            })
        }

        await this.prisma.$transaction(async function(transaction) {
            await transaction.oneTimePreKey.deleteMany({
                where: {
                    user_id: user.id
                }
            })

            await transaction.oneTimePreKey.createMany({
                data: one_time_pre_key.map(otpk => ({
                    key_id: otpk.key_id,
                    public_key: Buffer.from(otpk.public_key, 'base64'),
                    is_used: otpk.is_used,
                    user_id: user.id
                })),
                skipDuplicates: true
            })
        })

        prekeyBundle.user_id = user.id
        return prekeyBundle
    }
}
