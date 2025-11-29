import { Module } from '@nestjs/common'
import { RegisterationService } from './registeration.service'
import { RegisterationController } from './registeration.controller'
import { PrismaModule } from 'src/prisma/prisma.module'

@Module({
  imports:[PrismaModule],
  controllers: [RegisterationController],
  providers: [RegisterationService],
})
export class RegisterationModule {}
