import validator from 'validator';
import { Request } from 'express';
function validateSignupData(req: Request) {
  const { email, user_name, password, first_name,phone_number } = req.body;

  if (!first_name || first_name.length < 2) {
    throw new Error("First name is required (min 2 chars)");
  }

  if (!user_name || !validator.isAlphanumeric(user_name)) {
    throw new Error("Username must be alphanumeric (no spaces/symbols)");
  }
  if(!validator.isMobilePhone){
    throw new Error('Please enter correct phone number')
  }

  if (!validator.isEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  if (!validator.isStrongPassword(password, {
    minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1
  })) {
    throw new Error("Password is too weak! Follow the requirements below.");
  }

  return true; // If it reaches here, data is valid
}

export { validateSignupData };
