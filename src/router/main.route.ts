import { Router } from "express";
import { prisma } from "../utils/prisma";

export const router = Router();

router.get("/", (_req, res) => {
  res.render("index");
});

router.get("/contacts", async (_req, res) => {
  const contacts = await prisma.contact.findMany({
    where: {
        linkPrecedence: 'primary',
    },
    include: {
      linkingContacts: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  res.render("contacts", { contacts });
});
