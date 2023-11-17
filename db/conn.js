const { MongoClient, ObjectId } = require('mongodb');
require("dotenv").config({path: "./config.env"});
const Db = process.env.MONGO_URI
const dbName = 'magazyn';

let db;


module.exports = {
  connect: async () => {
    if (!db) {
      const client = await MongoClient.connect(Db);
      db = client.db(dbName);
      console.log("Połączono z bazą MongoDB");
    }
    return db;
  },
};
