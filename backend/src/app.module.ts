import { Module } from '@nestjs/common';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';

@Module({
  imports: [RecruitmentModule],
})
export class AppModule {}
