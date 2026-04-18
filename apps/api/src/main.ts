import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { AppConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get("corsOrigin", { infer: true }),
    credentials: true,
  });
  app.setGlobalPrefix(config.get("apiPrefix", { infer: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get("port", { infer: true });
  await app.listen(port);

  new Logger("Bootstrap").log(
    `API up on http://localhost:${port}/${config.get("apiPrefix", { infer: true })}`,
  );
}

void bootstrap();
