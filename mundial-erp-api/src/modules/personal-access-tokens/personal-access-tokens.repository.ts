import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const userSelect = { id: true, name: true, email: true } as const;

@Injectable()
export class PersonalAccessTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PersonalAccessTokenUncheckedCreateInput) {
    return this.prisma.personalAccessToken.create({
      data,
      include: { user: { select: userSelect } },
    });
  }

  findManyByUser(userId: string, params: { skip: number; take: number }) {
    return this.prisma.personalAccessToken.findMany({
      where: { userId, revokedAt: null },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: userSelect } },
    });
  }

  findActiveById(id: string, userId: string) {
    return this.prisma.personalAccessToken.findFirst({
      where: { id, userId, revokedAt: null },
      include: { user: { select: userSelect } },
    });
  }

  findByIdAndUser(id: string, userId: string) {
    return this.prisma.personalAccessToken.findFirst({
      where: { id, userId },
    });
  }

  findActiveByHash(tokenHash: string) {
    return this.prisma.personalAccessToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });
  }

  revoke(id: string) {
    return this.prisma.personalAccessToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  touchLastUsed(id: string) {
    return this.prisma.personalAccessToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
