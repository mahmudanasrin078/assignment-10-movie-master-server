const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const admin = require("firebase-admin");
const serviceAccount = require("./firebaseServiceKey.json");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//-------------
const uri =
  "mongodb+srv://movieDB:NBgu2EX7H8MdMU6S@cluster0.ikezapk.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//  firebase key

// const middleware = (req, res, next) => {
//   console.log(req.headers.authorization);
//console.log("middleware");

// if (req.headers.authorization === "hello") {
//   next();
// } else {
//   res.send("not a valid parson");
// }
//   next();
// };

async function run() {
  try {
    await client.connect();

    const db = client.db("movieDB");

    //  collection toiri kora

    const movieCollection = db.collection("movies");
    const watchListCollection = db.collection("watch");
    const userCollection = db.collection("user");

    //-----------all movie data---------
    app.get("/movies", async (req, res) => {
      const result = await movieCollection.find().toArray();
      //    console.log(result)
      res.send(result);
    });

    //-----------------------------

    //-----1 ta movie data pete hole-----------

    app.get("/movies/:id", async (req, res) => {
      const { id } = req.params;
      //console.log(id);

      const result = await movieCollection.findOne({ _id: new ObjectId(id) });

      res.send({
        success: true,
        result,
      });
    });

    //----database e kisu add movie korte hole----post method-----
    app.post("/movies", async (req, res) => {
      const data = req.body;

      console.log(data);

      const result = await movieCollection.insertOne(data);

      res.send({
        success: true,
        result,
      });
    });
    // ======user collection
    // app.post("/user", async (req, res) => {
    //   const data = req.body;

    //   console.log(data);

    //   const result = await userCollection.insertOne(data);

    //   res.send({
    //     success: true,
    //     result,
    //   });
    // });

    // app.get("/stats", async (req, res) => {
    //   const result = await userCollection.countDocuments();

    //   console.log(result);
    //   res.send({ user: result });
    // });

    //---------update movie---put-----

    app.put("/movies/:id", async (req, res) => {
      const { id } = req.params;

      const data = req.body;
      //console.log(id);
      //console.log(data);

      const objectId = new ObjectId(id);
      const filter = { _id: objectId };

      const update = {
        $set: data,
      };
      const result = await movieCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });

    // -------------
    //-----delete-------
    app.delete("/movies/:id", async (req, res) => {
      const { id } = req.params;

      const objectId = new ObjectId(id);
      const filter = { _id: objectId };

      const result = await movieCollection.deleteOne(filter);

      res.send({
        success: true,
        result,
      });
    });

    //----latest require data-----

    app.get("/latest-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ releaseYear: -1 })
        .limit(6)
        .toArray();
      console.log(result);
      res.send(result);
    });

    //----Top Rated Movies-----

    app.get("/topRated-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ rating: -1 })
        .limit(5)
        .toArray();
      console.log(result);
      res.send(result);
    });
    // ---- My Collection-----

    app.get("/my-collection", async (req, res) => {
      const email = req.query.email;

      const result = await movieCollection.find({ addedBy: email }).toArray();

      res.send(result);
    });

    // --------watch-list-mongodb-------

    app.post("/watch-list", async (req, res) => {
      const data = req.body;

      const result = await watchListCollection.insertOne(data);

      res.send(result);
    });
    // --------watch-list-ui-------

    app.get("/my-watchList", async (req, res) => {
      const email = req.query.email;

      const result = await watchListCollection
        .find({
          watched_by: email,
        })
        .toArray();

      res.send(result);
    });

    // --------filter section------------

    // app.get("/filter-movies", async (req, res) => {
    //   try {
    //     const { genres, minRating, maxRating } = req.query;

    //     const filter = {};

    //     if (genres) {
    //       const genreArray = genres.split(",").map((g) => g.trim());
    //       filter.genre = { $in: genreArray };
    //     }

    //     if (minRating || maxRating) {
    //       filter.rating = {};
    //       if (minRating) filter.rating.$gte = parseFloat(minRating);
    //       if (maxRating) filter.rating.$lte = parseFloat(maxRating);
    //     }

    //     const result = await movieCollection.find(filter).toArray();
    //     res.send(result);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).send({ success: false, message: "Server Error" });
    //   }
    // });

    app.get("/filter-movies", async (req, res) => {
      try {
        const { genres, minRating, maxRating } = req.query;
        const filter = {};

        if (genres) {
          const genreArray = genres.split(",").map((g) => g.trim());
          filter.$or = genreArray.map((g) => ({
            genre: { $regex: `\\b${g}\\b`, $options: "i" },
          }));
        }

        if (minRating || maxRating) {
          filter.rating = {};
          if (minRating) filter.rating.$gte = parseFloat(minRating);
          if (maxRating) filter.rating.$lte = parseFloat(maxRating);
        }

        const result = await movieCollection.find(filter).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error filtering movies:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // -------------
    await client.db("admin").command({ ping: 1 });
    console.log(" You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! SERVER IS RUNNING");
});

// app.get("/movies", (req, res) => {
//   res.send("Movie SERVER IS RUNNING");
// });

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
