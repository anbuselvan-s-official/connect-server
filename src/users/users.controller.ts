import { Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '@prisma/client';
import ProfileUpdateRequest from 'types/request/ProfileUpdateRequest';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('search')
  searchUsers(
    @Query('q') query: string = '',
    @Query('limit') limit: number = 20
  ) {
    return this.usersService.searchUsers(query, limit)
  }

  @Get('/:userId')
  getUser(@Param('userId') userId: string){
    return this.usersService.getUser(userId)
  }

  @Get('profile')
  getSelfProfile(@Request() request: { user: User }) {

  }

  @Post('profile')
  updateProfile(@Request() request: { user: User, body: ProfileUpdateRequest }) {
    return this.usersService.updateProfile(request.body, request.user)
  }

  @Get('profile/:userId')
  async getUserProfile(@Param('userId') userId: string) {

  }
}
