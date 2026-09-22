import { IsString, IsEmail, IsOptional, IsIn, MinLength, Equals } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// El formulario público siempre manda este campo en el FormData aunque la
// vacante no lo pida (queda como ''); @IsOptional() de class-validator solo
// omite la validación en null/undefined, no en '', así que sin este Transform
// un string vacío seguiría fallando @IsEmail().
const emptyToUndefined = ({ value }: { value: string }) => (value === '' ? undefined : value);

// FormData solo manda strings, así que el checkbox llega como 'true'/'false'
// en vez de un boolean real; se normaliza antes de exigir @Equals(true).
const stringToBoolean = ({ value }: { value: unknown }) => value === 'true' || value === true;

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

  @ApiProperty({ example: 'true', description: 'Debe ser true: el candidato aceptó la política de privacidad' })
  @Transform(stringToBoolean)
  @Equals(true, { message: 'Debe aceptar la política de privacidad para continuar.' })
  aceptaTratamientoDatos: boolean;
}
