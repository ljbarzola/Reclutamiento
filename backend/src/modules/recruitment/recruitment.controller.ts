import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RecruitmentService } from './recruitment.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';

@ApiTags('recruitment')
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Obtener puestos activos desde Google Drive' })
  async getActiveJobs() {
    return this.recruitmentService.getActiveJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Obtener puesto por ID' })
  async getJobById(@Param('id') id: string) {
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      throw new BadRequestException('Invalid job ID');
    }
    return this.recruitmentService.getJobById(jobId);
  }

  @Post('applications/submit')
  @ApiOperation({ summary: 'Enviar aplicación con documentos' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', example: 'Juan Pérez' },
        cedula: { type: 'string', example: '0987654321' },
        telefono: { type: 'string', example: '+593 99 123 4567' },
        email: { type: 'string', example: 'juan@email.com' },
        jobId: { type: 'string', example: '1' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['nombre', 'cedula', 'email', 'jobId'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async submitApplication(
    @Body() dto: SubmitApplicationDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.recruitmentService.submitApplication(dto, files || []);
  }
}
