import { Body, Controller, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("/")
  append(@Body() body: { data: string}){
    this.analyticsService.append(body)
  }
}
