import * as fs from "node:fs";
import * as path from "node:path";

import {
	Injectable,
	Logger,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";

@Injectable()
export class ImageUploadService {
	private readonly logger = new Logger(ImageUploadService.name);

	/**
	 * Node Environment
	 */
	nodeEnv: string = "";

	/**
	 * API Host
	 */
	apiHost: string = "";

	/**
	 * Access token
	 */
	accessToken: string = "";

	constructor(private readonly configService: ConfigService) {
		this.nodeEnv = this.configService.get<string>('NODE_ENV') as string;
		this.apiHost = this.configService.get<string>("API_HOST") as string;
		this.accessToken = this.configService.get<string>('ACCESS_TOKEN') as string;
		if (!this.accessToken) {
			switch (this.nodeEnv) {
				case "dev":
					this.accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZDRkMjdkYS1jMDAxLTQ4ZTYtOWQ5Mi1mNGFlYjRjZmNkNmQiLCJ0eXBlIjoiY2xpZW50IiwiaWF0IjoxNzc4MzIwOTk4LCJleHAiOjE3OTM4NzI5OTgsImlzcyI6IkNhbWlvbiJ9.Bbq-dTsGmxCEySQ8SJWKLKj2UY6PGq2LAyx5g_rZdw9z7mP4JKir-SyeJ66CoRhh-saLBHj0O3g87-Sv72agRXohtOV7jleSi_8xoz8eLZWcwNxGRDXFeOuCd790_HemGLZEbgcfNMdhOCG72KeDMOJecFbFpUXCg2y8B2DnhsCI-D4t0LPiiVTcfxDvtG_100Lt0r8iyXnEnANjBV365HPzxsZt41VAgKjdLzaV7pApdHEVESrkqfUPhqv2Bl39Jw3e4MHl2O0WosdMPVPk99ZRRmlWdWtvxlL511T1YjtlU57xRXkyB0P1GvlmsyR4cNfvSNbzAdBaS_b3ILZMKw";
					break;
				case "prod":
					this.accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MGMyZTJjMy0yMWQzLTQyNDAtODI3Zi1hZWI3MTQ0YWM4YmIiLCJ0eXBlIjoiY2xpZW50IiwiaWF0IjoxNzc4MzIzMzM5LCJleHAiOjE3Nzg0OTYxMzksImlzcyI6IkNhbWlvbiJ9.CtUC1lvWMOd_D7Iw41NKd9CO4hL2rjF537E7d0wC3smIkDgw4Ft-dIfVlFshBZkT5WyEeuA-5aVFER-fYx1qbUhwsCM6kbR1BsqQ4_CaV-ixCWiOzKw7Ysyt6nu9p4tU0n_67ept0eh00sZx6XEuQ4VoD9bLszHiWNKxRf0sYRPIUQFVXELVRuvnkWX_UdL5eJrU0yzz_ElqNnX95J-COZGDDOZ-GOhk9AKxeyke4U5l43ZSXnQx6nIXo9OHXiGJJKN4Zs26j4kWnItN0s4aT98bxdGjLi4wZNZIMJob51U45oz_iII3VYRi439DDvJsIMCt3OmixkIXQ8CsPlMWqg";
					break;
				default:
					break;
			}
		}
	}

	/**
	 * Uploads an image to api host
	 *
	 * @param productUUID
	 * @param variantUUID
	 * @param imageUUID
	 * @param imagePath
	 * @param imageType
	 * @returns
	 */
	async uploadProductVariantImage(productUUID: string, variantUUID: string, imageUUID: string, imagePath: string, imageType: string): Promise<boolean> {
		this.logger.log(`Uploading image for product: ${productUUID}, variant: ${variantUUID}, image: ${imageUUID}`);
		this.logger.log(`Uploading image: ${imagePath}, type: ${imageType}`);

		// Read the image
		const buffer = fs.readFileSync(imagePath);

		// Create a file to be uploaded
		const image = new File([buffer], path.basename(imagePath), {
			type: imageType,
		});

		// Create the body of the form
		const form = new FormData();
		form.append("file", image);

		// Submit the form
		const res = await fetch(`${this.apiHost}/v1/products/${productUUID}/variants/${variantUUID}/images/${imageUUID}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
			body: form,
		});

		// Make sure the files are uploaded successfully
		if (res.status === 200) {
			return true;
		}

		return false;
	}

	sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Upload images to the api
	 *
	 * @param imageItems
	 * @returns
	 */
	uploadImageItems(imageItems: Array<{ key: string, outputPath: string, }>) {
		return Promise.all(imageItems.map(async imageItem => {
			const [batchItemUUID, productUUID, variantUUID, imageUUID] = imageItem.key.split('/');
			const res = await this.uploadProductVariantImage(productUUID, variantUUID, imageUUID, imageItem.outputPath, "image/png");
			await this.sleep(2000);
			return res;
		}));
	}
}
