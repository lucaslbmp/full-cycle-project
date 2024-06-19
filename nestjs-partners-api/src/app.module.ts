import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsController } from './events/events.controller';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsService } from './events/events.service';
import { SpotsModule } from './spots/spots.module';

@Module({
  imports: [EventsModule, PrismaModule, SpotsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
