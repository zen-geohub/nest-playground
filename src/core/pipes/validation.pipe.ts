import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import Joi from "joi";

@Injectable()
export class ValidationPipe<T> implements PipeTransform<T> {
  constructor(private schema: Joi.ObjectSchema) {}
  transform(value: T): T {
    const validationResult = this.schema.validate(value, {
      abortEarly: false, // Collect all errors
      stripUnknown: true, // Drop fields not defined in the schema
    }) as { error?: Joi.ValidationError; value: T };

    const { error, value: validated } = validationResult;

    if (error) {
      const errors = error.details.reduce(
        (acc, detail) => {
          const field = detail.path[0];

          acc[String(field)] = detail.message;

          return acc;
        },
        {} as Record<string, string>,
      );

      throw new BadRequestException({ message: errors, error: "Bad Request" });
    }

    return validated;
  }
}
