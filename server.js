const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const bodyParser = require('body-parser');
const {connect} = require('./db/conn');
const cors = require('cors');
const conn = require('./db/conn');
require("dotenv").config({path: `config.env`})
const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(cors());

app.post('/products', async (req, res) => {
  const db = await connect();
  const {name, price, description, quantity, unit} = req.body;

  const checkName = await db.collection('products').findOne({name});
  if (checkName) {
    return res.status(400).json({error: 'Nazwa podanego produktu nie jest unikalna'});
  }
  try {
    const result = await db.collection('products').insertOne({name, price, description, quantity, unit});
    res.json(result.ops[0]);
  } finally {
    return res.status(200).json({'wynik': 'Dodano produkt'})
  }
});

app.get('/products', async (req, res) => {
  try {
    const db = await connect();
    let query = {};

    if (req.query.filter) {
      try {
        const filterObj = JSON.parse(req.query.filter);
        query = { ...query, ...filterObj };
      } catch (error) {
        return res.status(400).json({error: "Błąd przy filtrowaniu"});
      }
    }
    let sortOptions = {};
    if (req.query.sortBy && req.query.sortField) {
      sortOptions[req.query.sortField] = req.query.sortBy === "desc" ? -1 : 1;
    }

    let result = await db.collection("products").find(query).sort(sortOptions).toArray();

    res.json(result);
  } catch (error) {
    res.status(500).json({error: "Błąd serwera"});
  }
  });

  app.put('/products/:id', async (req, res) => {
    try {
      const db = await connect();
      let productId = {_id: new ObjectId(req.params.id)};
      let setValues = {
        $set: {
          name: req.body.name,
          price: req.body.price,
          description: req.body.description,
          quantity: req.body.quantity,
          unit: req.body.unit,
        },
      };
  
      let checkId = await db.collection("products").find(productId);
  
      if (!checkId) {
        res.status(404).json({error: "Produkt nieznaleziony"});
      } else {
        let updateRes = await db.collection("products").updateOne(productId, setValues);
        res.json(updateRes);
      }
    } catch (error) {
      res.status(500).json({error: "Błąd serwera"});
    }
  });

  app.delete('/products/:id', async (req, res) => {
  try {
    const db = await connect();
    let productId = {_id: new ObjectId(req.params.id)};

    let checkId = await db.collection("products").findOne(productId);
    if (!checkId) {
      res.status(404).json({error: "Produkt nieodnaleziony"});
    } else {
      let delRes = await db.collection("products").deleteOne(productId);
      res.json(delRes);
    }

  } catch (error) {
    res.status(500).json({error: "Błąd serwera"});
  }
  });

  app.get('/report', async (req, res) => {
    try {
      const db = await connect();
      const report = await db.collection("products").aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: {$sum: "$quantity"},
            totalPrice: {$sum: {$multiply: ["$price", "$quantity"]}},
            products: {
              $push: {
                name: "$name",
                quantity: "$quantity",
                productValue: {$multiply: ["$quantity", "$price"]},
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalQuantity: 1,
            totalPrice: 1,
            totalValue: {$multiply: ["$totalQuantity", "$totalPrice"]},
            products: 1,
          },
        },
      ]).toArray();
  
      res.json(report);
    } catch (error) {
      res.status(500).json({error: "Błąd serwera"});
    }
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
