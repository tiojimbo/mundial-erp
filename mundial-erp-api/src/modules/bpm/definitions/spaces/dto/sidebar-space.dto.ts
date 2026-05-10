import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SidebarProcessDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  processType: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  featureRoute: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  isProtected: boolean;

  @ApiProperty()
  sortOrder: number;
}

export class SidebarAreaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ type: [SidebarProcessDto] })
  processes: SidebarProcessDto[];
}

export class SidebarDepartmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  color: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isProtected: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [SidebarAreaDto] })
  areas: SidebarAreaDto[];

  @ApiProperty({
    type: [SidebarProcessDto],
    description: 'Processos diretos no departamento (sem área)',
  })
  directProcesses: SidebarProcessDto[];
}
