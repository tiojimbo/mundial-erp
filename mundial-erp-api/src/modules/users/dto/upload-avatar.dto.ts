import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UploadAvatarDto {
  @ApiProperty({ description: 'Imagem como data URL base64' })
  @IsString()
  @Matches(/^data:image\/(png|jpe?g|webp);base64,/i, {
    message: 'image deve ser um data URL base64 (png, jpeg ou webp)',
  })
  image!: string;
}
