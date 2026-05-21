import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'eitherListFolderSpace', async: false })
class EitherScopeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as CreateStatusDto;
    return Boolean(obj.listId || obj.folderId || obj.spaceId);
  }
  defaultMessage() {
    return 'Either listId or folderId or spaceId is required';
  }
}

export class CreateStatusDto {
  @ApiProperty({ enum: StatusType, example: 'ACTIVE' })
  @IsEnum(StatusType)
  type: StatusType;

  @ApiProperty({ example: 'Em Andamento' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: '#3B82F6' })
  @IsString()
  color: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  position: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Validate(EitherScopeConstraint)
  spaceId?: string;
}
