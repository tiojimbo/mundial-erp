import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyTaskStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  type: string;
}

export class MyTaskListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  folder: string | null;
}

export class MyTaskAssigneeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class MyTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  priority: string | null;

  @ApiPropertyOptional()
  dueDate: string | null;

  @ApiPropertyOptional()
  startDate: string | null;

  @ApiProperty({ type: MyTaskStatusDto })
  status: MyTaskStatusDto;

  @ApiProperty({ type: MyTaskListDto })
  list: MyTaskListDto;

  @ApiProperty({ type: [MyTaskAssigneeDto] })
  assignees: MyTaskAssigneeDto[];

  @ApiPropertyOptional()
  taskType: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  dateDone: string | null;
}

export class MyTasksDayGroupDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: [MyTaskDto] })
  tasks: MyTaskDto[];
}

export class MyTasksSummaryDto {
  @ApiProperty()
  overdueCount: number;

  @ApiProperty()
  dueTodayCount: number;

  @ApiProperty()
  dueTomorrowCount: number;

  @ApiProperty()
  dueNextSevenDaysCount: number;

  @ApiProperty()
  dueNextDaysCount: number;

  @ApiProperty()
  upcomingCount: number;

  @ApiProperty()
  noDueDateCount: number;

  @ApiProperty()
  completedCount: number;

  @ApiProperty()
  totalActive: number;
}

export class MyTasksResponseDto {
  @ApiProperty({ type: MyTasksSummaryDto })
  summary: MyTasksSummaryDto;

  @ApiProperty({ type: [MyTaskDto] })
  overdue: MyTaskDto[];

  @ApiProperty({ type: [MyTaskDto] })
  dueToday: MyTaskDto[];

  @ApiProperty({ type: [MyTaskDto] })
  dueTomorrow: MyTaskDto[];

  @ApiProperty({ type: [MyTasksDayGroupDto] })
  dueByDay: MyTasksDayGroupDto[];

  @ApiProperty({ type: [MyTaskDto] })
  upcoming: MyTaskDto[];

  @ApiProperty({ type: [MyTaskDto] })
  noDueDate: MyTaskDto[];

  @ApiProperty({ type: [MyTaskDto] })
  recentlyCompleted: MyTaskDto[];
}
