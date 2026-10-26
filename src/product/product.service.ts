import {
	Injectable,
	InternalServerErrorException,
	Logger,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";

import type { Product } from "../types";

import { PROMPTS } from "../prompts/prompts";

@Injectable()
export class ProductService {
	private readonly logger = new Logger(ProductService.name);

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
	 * Retrieves a product using the api
	 *
	 * @param productUUID
	 * @returns
	 */
	async getProduct(productUUID: string): Promise<Product> {
		let product: Product;

		// Fetch the product and its images using rest api
		try {
			const res = await fetch(`${this.apiHost}/v1/products/${productUUID}`, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
				},
			});

			// Handle successful response
			if (res.status === 200) {
				product = await res.json();
			} else {
				console.log(await res.json());
				throw new Error(`Failed to fetch the product.`);
			}
		} catch (err) {
			this.logger.error(err);
			throw new InternalServerErrorException({
				error: `Failed to fetch the product. Please check and try again. ${(err as Error).message}`,
			});
		}

		return product;
	}

	/**
	 * Returns the items of a product for the batch
	 *
	 * @param product
	 * @returns
	 */
	getBatchItems(product: Product): Array<{ productUUID: string; variantUUID: string; imageUUID: string; imageUri: string; }> {
		if (!product || !product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
			return [];
		}

		let items: Array<{ productUUID: string; variantUUID: string; imageUUID: string; imageUri: string; }> = [];

		product.variants
			// Filter out variants with no images.
			.filter(variant => variant !== null && variant.images !== null && variant.images !== undefined && Array.isArray(variant.images) && variant.images.length !== 0)
			.map(variant => {
				variant.images
					.filter(image => image !== null && image.imageUrl !== null && image.imageUrl !== undefined)
					.forEach(image => {
						items[items.length] = {
							productUUID: product.uuid,
							variantUUID: variant.uuid,
							imageUUID: image.uuid,
							imageUri: image.imageUrl,
						};
					});
			});

		return items;
	}

	/**
	 * Returns the prompt for the current product
	 *
	 * @param product
	 * @returns
	 */
	getPrompt(product: Product): string {
		let prompt: string | null = null;

		// Make sure we have categories applied on the product.
		if (product.productCategories !== null && product.productCategories !== undefined && Array.isArray(product.productCategories) && product.productCategories.length !== 0) {
			const lastCategory = product.productCategories.filter(entry => entry.category !== null).sort((a, b) => b.id - a.id).at(0);
			if (lastCategory?.category !== null && lastCategory?.category !== undefined && lastCategory.category.slug !== undefined && lastCategory.category.slug !== null && PROMPTS[lastCategory.category.slug] !== undefined) {
				prompt = PROMPTS[lastCategory.category.slug];
			}
		}

		if (!prompt) {
			return PROMPTS["DEFAULT"];
		}

		return prompt;
	}

}
