import { Router } from "express";
import * as ContactController from "../controllers/contact.controller";

export const router = Router();

router.post("/api/identify", ContactController.POST);
