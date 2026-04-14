import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-1',
  email: 'test@mundial.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  refreshToken: 'hashed-refresh-token',
  role: 'OPERATOR' as const,
  isActive: true,
  departmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepository = module.get(UsersRepository);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register({
        email: 'test@mundial.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@mundial.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshToken');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@mundial.com', passwordHash: 'hashed-password' }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@mundial.com', name: 'Test', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@mundial.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@mundial.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@mundial.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for inactive user', async () => {
      usersRepository.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'test@mundial.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should return new token pair with rotation', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.refresh('user-1', 'valid-refresh-token');

      expect(result.tokens.accessToken).toBe('new-access');
      expect(result.tokens.refreshToken).toBe('new-refresh');
      expect(usersRepository.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('bad-id', 'token')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no stored refresh token', async () => {
      usersRepository.findById.mockResolvedValue({ ...mockUser, refreshToken: null });

      await expect(service.refresh('user-1', 'token')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if refresh token hash mismatch', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('user-1', 'bad-token')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should set refresh token to null', async () => {
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      await service.logout('user-1');

      expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith('user-1', null);
    });
  });

  describe('me', () => {
    it('should return user data without sensitive fields', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.me('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@mundial.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.me('bad-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
