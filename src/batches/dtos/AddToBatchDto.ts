import {
	IsUUID,
} from "class-validator";

export class CreateBatchDto {
	@IsUUID()
	readonly productUUID: string;
}
