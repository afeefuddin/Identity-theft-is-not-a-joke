import { Router } from "express";
import * as ContactController from "controllers/contact.controller";

export const router = Router();

router.get("/identify", ContactController.GET);
