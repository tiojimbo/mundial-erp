import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PaginationDto } from '../../common/dtos/pagination.dto';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-1',
  email: 'test@mundial.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  refreshToken: null,
  role: 'OPERATOR' as const,
  isActive: true,
  departmentId: null,
  lastAccessedWorkspaceId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.create({
        email: 'test@mundial.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@mundial.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw ConflictException if email exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@mundial.com',
          name: 'Test',
          password: 'pass123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should assign role when provided', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockUser,
        role: 'ADMIN' as const,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.create({
        email: 'admin@mundial.com',
        name: 'Admin',
        password: 'pass123',
        role: 'ADMIN' as const,
      });

      expect(result.role).toBe('ADMIN');
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      repository.findMany.mockResolvedValue({ items: [mockUser], total: 1 });

      const pagination = new PaginationDto();
      const result = await service.findAll(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });

      const result = await service.update('user-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new email is taken', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue({ ...mockUser, id: 'user-2' });

      await expect(
        service.update('user-1', { email: 'taken@mundial.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password when updated', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await service.update('user-1', { password: 'newpass123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
      expect(repository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ passwordHash: 'new-hashed' }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.softDelete.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.remove('user-1');

      expect(repository.softDelete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
