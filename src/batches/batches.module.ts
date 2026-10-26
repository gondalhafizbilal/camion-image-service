import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Batch } from './entities/batch.entity';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';

import { BatchItem } from './entities/batch-item.entity';
import { BatchItemsService } from './batch-items.service';
import { BatchItemsController } from './batch-items.controller';

import { GoogleGeminiService } from '../genai/gen-ai.service';
import { ImageService } from '../image/image.service';
import { RequestsService } from './requests.service';
import { ProductService } from '../product/product.service';

import { BatchUpdateCronService } from '../cron/batch-update-cron.service';
import { BatchSubmitCronService } from '../cron/batch-submit-cron.service';
import { ImageUploadService } from '../image/image-upload.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Batch,
			BatchItem,
		]),
	],
	providers: [
		BatchesService,
		BatchItemsService,
		RequestsService,
		GoogleGeminiService,
		ImageService,
		ProductService,
		BatchSubmitCronService,
		BatchUpdateCronService,
		ImageUploadService,
	],
	controllers: [
		BatchesController,
		BatchItemsController,
	],
})
export class BatchesModule { }
