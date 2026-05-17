import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  role: {
  type: String,
  enum: ["citizen", "authority", "admin"],
  default: "citizen"
  },
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  password:{
    type:String,
    required:true
  },

  phone: { 
    type: String, 
    required: true }

}, { timestamps: true });

const User = mongoose.model("User",userSchema)

export default User;