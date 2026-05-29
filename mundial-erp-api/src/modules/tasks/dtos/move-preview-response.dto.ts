import { ApiProperty } from '@nestjs/swagger';
import { StatusType } from '@prisma/client';

export class StatusDiffDto {
  @ApiProperty()
  sourceStatusId!: string;

  @ApiProperty()
  sourceName!: string;

  @ApiProperty({ enum: StatusType })
  sourceType!: StatusType;

  @ApiProperty({ nullable: true })
  autoTargetStatusId!: string | null;

  @ApiProperty({ nullable: true })
  autoTargetName!: string | null;

  @ApiProperty()
  taskCount!: number;
}

export class CustomFieldDiffItemDto {
  @ApiProperty()
  customFieldId!: string;

  @ApiProperty()
  customFieldName!: string;

  @ApiProperty()
  taskCount!: number;
}

export class CustomFieldDiffsDto {
  @ApiProperty({ type: [CustomFieldDiffItemDto] })
  onlyInSource!: CustomFieldDiffItemDto[];

  @ApiProperty({ type: [CustomFieldDiffItemDto] })
  onlyInTarget!: CustomFieldDiffItemDto[];

  @ApiProperty({ type: [CustomFieldDiffItemDto] })
  inBoth!: CustomFieldDiffItemDto[];
}

export class MovePreviewResponseDto {
  @ApiProperty()
  needsReconciliation!: boolean;

  @ApiProperty({ type: [StatusDiffDto] })
  statusDiffs!: StatusDiffDto[];

  @ApiProperty({ type: CustomFieldDiffsDto })
  customFieldDiffs!: CustomFieldDiffsDto;
}
