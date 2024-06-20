import { Module } from '@nestjs/common';
import { EventsCoreModule } from '@app/core/events/events.module';
import { EventsController } from './events.controller';

@Module({
  imports: [EventsCoreModule],
  controllers: [EventsController],
})
export class EventsModule {}
