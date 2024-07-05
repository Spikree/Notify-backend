import mongoose from "mongoose";
const schema = mongoose.Schema;

const userSchema = new schema({
    fullName: {type: String},
    email: {type:String},
    password: {type:String},
    createdOn: {type: Date, default: new Date().getTime()},
});

export default mongoose.model("User",userSchema);