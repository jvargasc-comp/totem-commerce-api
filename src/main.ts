import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
//import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import { AppModule } from './app.module';
/*import type {
  CorsConfig,
  NestConfig,
  SwaggerConfig,
} from './common/configs/config.interface';
*/
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation
  //app.useGlobalPipes(new ValidationPipe());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // enable shutdown hook
  app.enableShutdownHooks();

  // Prisma Client Exception Filter for unhandled exceptions
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const configService = app.get(ConfigService);
  const nestConfig = configService.get('nest') ?? { port: 3000 };
  const corsConfig = configService.get('cors') ?? { enabled: false };
  //const swaggerConfig = configService.get('swagger') ?? { enabled: false };

  // Swagger Api
  /*
  if (swaggerConfig.enabled) {
    const options = new DocumentBuilder()
      .setTitle(swaggerConfig.title || 'Nestjs')
      .setDescription(swaggerConfig.description || 'The nestjs API description')
      .setVersion(swaggerConfig.version || '1.0')
      .build();
    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup(swaggerConfig.path || 'api', app, document);
  }
  */
  // Cors
  app.enableCors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  console.log('Cors:', corsConfig.enabled.toString());
  await app.listen(Number(process.env.PORT) || nestConfig.port || 3000);
}
bootstrap();
