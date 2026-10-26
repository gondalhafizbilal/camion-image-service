import {
	NestFactory,
	Reflector,
} from '@nestjs/core';

import {
	BadRequestException,
	ClassSerializerInterceptor,
	ValidationError,
	ValidationPipe,
} from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Add validation pipe
	app.useGlobalPipes(new ValidationPipe({
		transform: true,
		stopAtFirstError: false,
		exceptionFactory: (errors: Array<ValidationError>) => {
			return new BadRequestException({
				errors: Object.fromEntries(errors.map(error => [
					error.property,
					error.constraints !== null && error.constraints !== undefined
						? error.constraints[Object.keys(error.constraints)[0]]
						: "Validation failed"
				]))
			});
		},
	}));

	// Exclude @Exclude(d) items
	app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

	await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
