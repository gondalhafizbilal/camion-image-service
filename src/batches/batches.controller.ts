import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	Param,
	Post,
	Query,
} from '@nestjs/common';

import { BatchJob } from '@google/genai';

import { Batch } from './entities/batch.entity';
import { BatchesService } from './batches.service';

import { CreateBatchDto } from './dtos/AddToBatchDto';

@Controller('v1/batches')
export class BatchesController {
	constructor(@Inject(BatchesService) private readonly batchesService: BatchesService) { }

	@Post('new')
	@HttpCode(HttpStatus.CREATED)
	createBatch(@Body() body: CreateBatchDto): Promise<Batch> {
		return this.batchesService.createBatch(body);
	}

	@Post(':uuid/submit')
	@HttpCode(HttpStatus.CREATED)
	submitBatch(@Param('uuid') batchUUID: string): Promise<Batch> {
		return this.batchesService.submitBatchJobByUuid(batchUUID);
	}

	@Get(':uuid/job')
	@HttpCode(HttpStatus.OK)
	getBatchJob(@Param('uuid') batchUUID: string): Promise<BatchJob> {
		return this.batchesService.getBatchJob(batchUUID);
	}

	@Post(':uuid/apply')
	@HttpCode(HttpStatus.CREATED)
	applyBatch(@Param('uuid') batchUUID: string): Promise<Batch> {
		return this.batchesService.applyBatchJobByUuid(batchUUID);
	}

	@Get()
	@HttpCode(HttpStatus.OK)
	getBatches(
		@Query("pageNumber") pageNumber: number,
		@Query("itemsPerPage") itemsPerPage: number,
	): Promise<Array<Batch>> {
		return this.batchesService.getBatches(pageNumber, itemsPerPage);
	}

	@Get(':uuid')
	@HttpCode(HttpStatus.OK)
	getBatch(@Param('uuid') batchUUID: string): Promise<Batch> {
		return this.batchesService.getBatch(batchUUID);
	}

	@Delete(':uuid')
	@HttpCode(HttpStatus.OK)
	deleteBatch(@Param('uuid') batchUUID: string): Promise<void> {
		return this.batchesService.deleteBatch(batchUUID)
	}
}
