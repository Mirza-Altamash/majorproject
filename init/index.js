const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
  await mongoose.connect(MONGO_URL);
}

async function ensureSeedUser() {
  // Find or create the requested seed user so owner populate never becomes null
  let seedUser = await User.findOne({ username: "mirza" });
  if (!seedUser) {
    const user = new User({ username: "mirza", email: "mirza@gmail.com" });
    seedUser = await User.register(user, "password123");
  }
  return seedUser;
}

async function initDB() {
  await Listing.deleteMany({});
  const seedUser = await ensureSeedUser();

  const dataWithOwner = initData.data.map((obj) => ({
    ...obj,
    owner: seedUser._id,
  }));

  await Listing.insertMany(dataWithOwner);
  console.log("data was initialized with owner:", seedUser._id.toString());
}

main()
  .then(initDB)
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error(err);
    mongoose.connection.close();
  });
