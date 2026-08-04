import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const collections = await mongoose.connection.db
      .listCollections({ name: "cartordercounts" })
      .toArray();

    if (collections.length) {
      const coll = mongoose.connection.collection("cartordercounts");
      const indexes = await coll.indexes();

      const stale = indexes.find((i) => i.name === "shop_1_cartId_1");

      if (stale) {
        await coll.dropIndex("shop_1_cartId_1");
        console.log("Dropped stale index");
      }
    }
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}