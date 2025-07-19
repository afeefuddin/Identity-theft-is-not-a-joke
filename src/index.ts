import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as ContactRoute from "./router/contact.route";
import * as MainRoute from "./router/main.route";
import { errorHandler } from "./utils/errorHandler";
import hbs from "hbs";
import path from "path";

const app = express();

app.set("view engine", "hbs");
app.set("views", "src/views");
hbs.registerPartials(path.join(__dirname, "views/partials"));
app.use(express.static(path.join(__dirname, "assets")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(MainRoute.router);
app.use(ContactRoute.router);

app.use(errorHandler);

const port = process.env.PORT || 8001;
app.listen(port, () => {
  console.log("Server started on port: ", port);
});
