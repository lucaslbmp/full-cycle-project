import { Injectable } from "@nestjs/common";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ReserveSpotDto } from "./dto/reserve.spot.dto";
import { Prisma, SpotStatus, TicketStatus } from "@prisma/client";
import e from "express";

@Injectable()
export class EventsService {
  constructor(private prismaService: PrismaService) {}

  create(createEventDto: CreateEventDto) {
    return this.prismaService.event.create({
      data: {
        ...createEventDto,
        date: new Date(createEventDto.date),
      },
    });
  }

  findAll() {
    return this.prismaService.event.findMany();
  }

  findOne(id: string) {
    return this.prismaService.event.findUnique({ where: { id } });
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return this.prismaService.event.update({
      data: { ...updateEventDto, date: new Date(updateEventDto.date) },
      where: { id: id },
    });
  }

  remove(id: string) {
    return this.prismaService.event.delete({
      where: { id },
    });
  }

  async reserveSpot(dto: ReserveSpotDto & { eventId: string }) {
    const spots = await this.prismaService.spot.findMany({
      where: {
        eventId: dto.eventId,
        name: {
          in: dto.spots,
        },
      },
    });

    if(spots.length !== dto.spots.length){
      const foundSpotsName = spots.map(spot => spot.name);
      const notFoundSpotsName = dto.spots.filter( spotName => !foundSpotsName.includes(spotName));
      throw new Error(`Spots ${notFoundSpotsName.join(', ')} not found`);
    }

    try{
      const tickets = await this.prismaService.$transaction(async (prisma) => {
        await prisma.reservationHistory.createMany({
          data: spots.map(spot => ({
            spotId: spot.id,
            ticketKind: dto.ticket_kind,
            email: dto.email,
            status: TicketStatus.reserved
          }))
        });
    
        await prisma.spot.updateMany({
          where: {
            id: {
              in: spots.map(spot => spot.id)
            }
          },
          data: {
            status: SpotStatus.reserved, 
          }
        });
    
        // Usando varias queries do tipo create() ao inves de uma do tipo createMany() pelo fato de que createMany() não retorna os uid's
        const tickets = await Promise.all(
          spots.map(spot => prisma.ticket.create({
            data: {
              spotId: spot.id,
              ticketKind: dto.ticket_kind,
              email: dto.email,
            }
          }))
        )
        return tickets;
      }, {isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted})
      // ReadCommitted = usado quando só quero lidar com dados definitivos (commitados) no banco de dados

      return tickets;
    }catch(err){
      if(err instanceof Prisma.PrismaClientKnownRequestError){
        switch(err.code){
          case 'P2002': //unique constraint violation
            throw new Error('Spot already reserved');
          case 'P2034': //transaction conflict
          throw new Error('Some spots are already reserved');
          default:
            throw err;
        }
      }
    }
  }
}
