import mongoose from "mongoose";

// Official Mongoose pattern for Next.js
// Ref: https://mongoosejs.com/docs/nextjs.html
//
// "Calling mongoose.connect() when Mongoose is already connected is a no-op,
//  so you can safely call dbConnect() in every API route."
//
// Mongoose v9 manages connection state internally.
// The "global cached connection" pattern required in Next.js 13/14 is no longer needed.
// It is safe to call dbConnect() in every Server Component, Server Action, and Route Handler.
//
// NOTE Next.js 16: connection() from next/server CANNOT be called inside "use cache".
// Any caller that needs dynamic rendering must call connection() before dbConnect(),
// outside the cache boundary. dbConnect() only manages the Mongoose connection.
export default async function dbConnect() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "Define MONGODB_URI in .env.local\n" +
        "Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ovianta-noshow"
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  return mongoose;
}
