import { Controller, Get, Post, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Мої сповіщення' })
  getMyNotifications(@CurrentUser() user: User) {
    return this.notificationsService.getMyNotifications(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Позначити прочитаним' })
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }
}
