import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required()
});

export const scanSchema = Joi.object({
  message: Joi.string().min(3).required()
});