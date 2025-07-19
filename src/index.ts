import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as ContactRoute from "router/contact.route";

const app = express();
app.use(ContactRoute.router);

const port = process.env.PORT || 8001;
app.listen(port, () => {
  console.log("Server started on port: ", port);
});
