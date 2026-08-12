import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @MinLength(10)
  cedula: string;

  @ApiProperty({ example: '+593 99 123 4567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'juan.perez@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1' })
  @IsString()
  jobId: string;
}
