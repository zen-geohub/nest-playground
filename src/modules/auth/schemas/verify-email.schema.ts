import Joi from "joi";

export const VerifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});
