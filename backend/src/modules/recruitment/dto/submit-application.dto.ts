import { IsString, IsEmail, IsOptional, IsIn, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// El formulario público siempre manda este campo en el FormData aunque la
// vacante no lo pida (queda como ''); @IsOptional() de class-validator solo
// omite la validación en null/undefined, no en '', así que sin este Transform
// un string vacío seguiría fallando @IsEmail().
const emptyToUndefined = ({ value }: { value: string }) => (value === '' ? undefined : value);

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

  @ApiPropertyOptional({ example: 'juan.perez@email.com' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '1' })
  @IsString()
  jobId: string;

  @ApiPropertyOptional({ example: '{"Antecedentes Penales": "SI"}' })
  @IsOptional()
  @IsString()
  extraFields?: string;

  @ApiPropertyOptional({ example: 'individual', enum: ['individual', 'archivo_unico'] })
  @IsOptional()
  @IsIn(['individual', 'archivo_unico'])
  modoSubida?: string;
}
