// If Phone number and email both are present,
// they are trying to create links
// If any one of them is present they are just for retriving data

import { NextFunction, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { Contact, LinkPrecedence, Prisma } from "@prisma/client";

const contactGetBodySchema = z.union([
  z.object({ email: z.string().optional(), phoneNumber: z.string() }),
  z.object({ email: z.string(), phoneNumber: z.string().optional() }),
]);

type ContactWithRelations = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;

const contactInclude = {
  linkedContact: {
    select: {
      id: true,
      email: true,
      phoneNumber: true,
      linkingContacts: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  },
  linkingContacts: {
    select: {
      id: true,
      email: true,
      phoneNumber: true,
    },
  },
} as const;

function prepareOutput(data: ContactWithRelations) {
  const primaryContact =
    data.linkPrecedence === "primary" ? data : data.linkedContact;

  if (!primaryContact) {
    throw new Error("Primary Contact not found");
  }

  return {
    contact: {
      primaryContactId: primaryContact.id,
      emails: [
        primaryContact.email,
        ...primaryContact.linkingContacts.flatMap((l) => l.email),
      ],
      phoneNumber: [
        primaryContact.phoneNumber,
        ...primaryContact.linkingContacts.flatMap((l) => l.phoneNumber),
      ],
      secondaryContactIds: [
        primaryContact.linkingContacts.flatMap((l) => l.id),
      ],
    },
  };
}

export async function GET(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = contactGetBodySchema.parse(req.body);

    const filter: Prisma.ContactWhereInput = {};
    if (parsed.email) filter.email = parsed.email;
    if (parsed.phoneNumber) filter.phoneNumber = parsed.phoneNumber;

    const exactMatch = await prisma.contact.findFirst({
      where: filter,
      include: contactInclude,
    });

    if (exactMatch) {
      // Return response
      return res.status(200).json(prepareOutput(exactMatch));
    }

    if (!parsed.email || !parsed.phoneNumber) {
      // This means we should create and return
      // This is a unique one

      const data: { email?: string; phoneNumber?: string } = {};
      if (parsed.email) data.email = parsed.email;
      if (parsed.phoneNumber) data.phoneNumber = parsed.phoneNumber;

      const newContact = await prisma.contact.create({
        data: { linkPrecedence: "primary", ...data },
        include: contactInclude,
      });

      return res.status(200).json(prepareOutput(newContact));
    }

    // 


  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
      });
    }
    next(error);
  }
}
