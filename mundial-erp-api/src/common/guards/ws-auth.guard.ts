import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  authenticate(
    client: Socket,
  ): { sub: string; email: string; role: string } | null {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      this.logger.warn(`WS connection without token: ${client.id}`);
      return null;
    }

    try {
      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      return { sub: payload.sub, email: payload.email, role: payload.role };
    } catch {
      this.logger.warn(`WS invalid token: ${client.id}`);
      return null;
    }
  }
}
