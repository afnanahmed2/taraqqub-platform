import * as yup from "yup";

export const userSchemaValidation = yup.object().shape({
  name: yup
    .string()
    .required("Name is required"),

  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),

  phone: yup
    .string()
    .length(8, "Phone number must be 8 digits")
    .required("Mobile Phone is required"),


  password: yup
    .string()
    .min(4, "Password too short")
    .max(20)
    .required("Password is required"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords don't match")
    .required("Confirm password required")
});