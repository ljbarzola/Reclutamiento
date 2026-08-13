import { Module } from '@nestjs/common';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RecruitmentModule],
  controllers: [HealthController],
})
export class AppModule {}
