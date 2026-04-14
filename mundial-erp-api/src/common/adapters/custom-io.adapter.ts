import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

export class CustomIoAdapter extends IoAdapter {
  private readonly configService: ConfigService;

  constructor(app: INestApplication) {
    super(app);
    this.configService = app.get(ConfigService);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: [frontendUrl],
        credentials: true,
      },
    });
  }
}
