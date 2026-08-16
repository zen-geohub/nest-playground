import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import Joi from "joi";

/**
 * Custom NestJS pipe for validating and sanitizing request payloads using Joi schemas.
 *
 * @template T - Type of the payload being validated.
 */
@Injectable()
export class ValidationPipe<T> implements PipeTransform<T> {
  constructor(private schema: Joi.ObjectSchema) {}

  /**
   * Validates incoming request values against the configured Joi schema, stripping unknown fields.
   *
   * @param value - Incoming payload value.
   * @returns Validated and stripped payload object.
   * @throws BadRequestException containing field-level validation errors if validation fails.
   */
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
