import * as yup from "yup";

export const reportSchemaValidation = yup.object().shape({

  title: yup
    .string()
    .min(5, "Title too short")
    .required("Report title is required"),

  category: yup
    .string()
    .required("Category is required"),

  description: yup
    .string()
    .min(10, "Description must be at least 10 characters")
    .required("Description is required"),

  location: yup
    .string()
    .required("Location is required"),

  file: yup
    .mixed()
    .required("Photo or video is required")

});