import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { HealthController } from './health.controller';
import { GoogleModule } from './google/google.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 20 }]),
    GoogleModule,
    RecruitmentModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
