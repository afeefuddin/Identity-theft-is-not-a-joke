// If Phone number and email both are present,
// they are trying to create links
// If any one of them is present they are just for retriving data

import { NextFunction, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { contactInclude } from "../utils/contact.util";
import ContactService from "../services/contact.service";

const contactGetBodySchema = z.union([
  z.object({ email: z.email().optional(), phoneNumber: z.string().min(1) }),
  z.object({ email: z.email(), phoneNumber: z.string().optional() }),
]);

export async function POST(req: Request, res: Response, next: NextFunction) {
  try {
    console.log(req.body);
    const { email, phoneNumber } = contactGetBodySchema.parse(req.body);

    const filter: Prisma.ContactWhereInput = {};
    if (email) filter.email = email;
    if (phoneNumber) filter.phoneNumber = phoneNumber;

    const exactMatch = await prisma.contact.findFirst({
      where: filter,
      include: contactInclude,
    });

    if (exactMatch) {
      // Return response
      return res.status(200).json(ContactService.prepareOutput(exactMatch));
    }

    if (!email || !phoneNumber) {
      // This means we should create and return
      // This is a unique one

      const newContact = await ContactService.createContactAndReturnData({
        email,
        phoneNumber,
      });

      return res.status(200).json(newContact);
    }

    const contact = await ContactService.identifyOrCreateContact(
      email,
      phoneNumber
    );

    return res.status(200).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log(error);
      return res.status(400).json({
        error: "Invalid input",
      });
    }
    next(error);
  }
}
