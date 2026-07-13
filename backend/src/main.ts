import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3010';
  app.enableCors({ origin: corsOrigin.split(',').map((o) => o.trim()), credentials: true });

  const config = new DocumentBuilder()
    .setTitle('PNMA — Plateforme Numérique de Mobilité et d’Assistance')
    .setDescription('Orchestrateur d’assistance routière 24/7 : incidents, partenaires, assurance, préfinancement médical, IA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 4010;
  await app.listen(port);
  console.log(`PNMA API on port ${port}`);
}
bootstrap();
