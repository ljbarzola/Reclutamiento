import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás del frontal de Cloud Run, sin esto el límite de peticiones podría ver la
  // IP del proxy en vez de la del cliente. Se confía en 1 salto solo en Cloud Run
  // (K_SERVICE); TRUST_PROXY_HOPS lo cambia (0 lo apaga).
  const hopsEnv = process.env.TRUST_PROXY_HOPS;
  const proxyHops =
    hopsEnv !== undefined && hopsEnv !== '' ? Number(hopsEnv) : process.env.K_SERVICE ? 1 : 0;
  if (Number.isInteger(proxyHops) && proxyHops > 0) {
    app.set('trust proxy', proxyHops);
  }

  app.use(helmet());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://reclutamiento.gemeseg.com',
        'https://reclutamiento-505320.web.app',
        'https://reclutamiento-505320.firebaseapp.com',
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Documentación de la API solo en desarrollo o si se pide explícitamente.
  const swaggerEnabled =
    process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Portal de Reclutamiento - GEMESEG')
      .setDescription('API para el portal de reclutamiento automatizado')
      .setVersion('1.0')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
