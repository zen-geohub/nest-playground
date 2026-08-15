import Joi from "joi";

export const CreateUserSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).required(),
});
