import mongoose from "mongoose";
const DataBaseConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { maxPoolSize: 100 });
    console.log("Database Connected Successfully");
  } catch (error) {
    console.log("Error while connecting to database", error.message);
  }
};
export default DataBaseConnection;
