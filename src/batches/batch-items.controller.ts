import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	Param,
} from "@nestjs/common";

import { BatchItem } from "./entities/batch-item.entity";
import { BatchItemsService } from "./batch-items.service";

@Controller("v1/batches/:batchUUID/items")
export class BatchItemsController {
	constructor(@Inject(BatchItemsService) private readonly batchItemsService: BatchItemsService) { }

	@Get()
	@HttpCode(HttpStatus.OK)
	getBatchItems(@Param('batchUUID') batchUUID: string): Promise<Array<BatchItem>> {
		return this.batchItemsService.getBatchItems(batchUUID);
	}

	@Get(':uuid')
	@HttpCode(HttpStatus.OK)
	getBatchItem(@Param('uuid') batchItemUUID: string): Promise<BatchItem> {
		return this.batchItemsService.getBatchItem(batchItemUUID);
	}

	@Delete(':uuid')
	@HttpCode(HttpStatus.OK)
	deleteBatchItem(@Param('uuid') batchItemUUID: string): Promise<void> {
		return this.batchItemsService.deleteBatchItem(batchItemUUID);
	}
}
