import * as fs from "node:fs";
import * as path from "node:path";

import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BatchesModule } from './batches/batches.module';
import { Batch } from "./batches/entities/batch.entity";
import { BatchItem } from "./batches/entities/batch-item.entity";
import { HealthModule } from "./health/health.module";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				ssl: configService.get<string>("NODE_ENV") === "local"
					? false
					: {
						rejectUnauthorized: false,
						ca: fs.readFileSync(path.join(process.cwd(), "ca/global-bundle.pem"), "utf-8"),
					},
				host: configService.get<string>("DB_HOST"),
				port: configService.get<number>("DB_PORT"),
				username: configService.get<string>("DB_USERNAME"),
				password: configService.get<string>("DB_PASSWORD"),
				database: configService.get<string>("DB_DATABASE"),
				synchronize: true,
				namingStrategy: new SnakeNamingStrategy(),
				logging: false,
				entities: [
					Batch,
					BatchItem,
				],
			}),
		}),
		BatchesModule,
		HealthModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { }
