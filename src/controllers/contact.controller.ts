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
      createdAt: true,
      linkingContacts: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
        },
      },
    },
  },
  linkingContacts: {
    select: {
      id: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
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

async function createContactAndReturnData({
  email,
  phoneNumber,
  linkedId,
  linkPrecedence,
}: {
  email?: string;
  phoneNumber?: string;
  linkPrecedence?: "primary" | "secondary";
  linkedId?: number;
}) {
  const data: { email?: string; phoneNumber?: string; linkedId?: number } = {};
  if (email) data.email = email;
  if (phoneNumber) data.phoneNumber = phoneNumber;
  if (linkedId) data.linkedId = linkedId;

  const newContact = await prisma.contact.create({
    data: { linkPrecedence: linkPrecedence ?? "primary", ...data },
    include: contactInclude,
  });

  return prepareOutput(newContact);
}

export async function GET(req: Request, res: Response, next: NextFunction) {
  try {
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
      return res.status(200).json(prepareOutput(exactMatch));
    }

    if (!email || !phoneNumber) {
      // This means we should create and return
      // This is a unique one

      const newContact = await createContactAndReturnData({
        email,
        phoneNumber,
      });

      return res.status(200).json(newContact);
    }

    const emailMatch = await prisma.contact.findFirst({
      where: {
        email,
      },
      include: contactInclude,
    });

    const phoneMatch = await prisma.contact.findFirst({
      where: {
        phoneNumber,
      },
      include: contactInclude,
    });

    if (!emailMatch && !phoneMatch) {
      const newContact = await createContactAndReturnData({
        email,
        phoneNumber,
      });

      return res.status(200).json(newContact);
    } else if (!phoneMatch && emailMatch) {
      // There is email match who's primary will be the primary of new contact
      const emailMatchPrimary =
        emailMatch.linkPrecedence === "primary"
          ? emailMatch
          : emailMatch.linkedContact;

      if (!emailMatchPrimary) {
        throw new Error("Sever Error");
      }

      const newContact = await createContactAndReturnData({
        email,
        phoneNumber,
        linkedId: emailMatchPrimary.id,
        linkPrecedence: "secondary",
      });

      return res.status(200).json(newContact);
    } else if (!emailMatch && phoneMatch) {
      // There is phone match who's primary will be the primary of new contact
      const phoneMatchPrimary =
        phoneMatch.linkPrecedence === "primary"
          ? phoneMatch
          : phoneMatch.linkedContact;
      if (!phoneMatchPrimary) {
        throw new Error("Sever Error");
      }

      const newContact = await createContactAndReturnData({
        email,
        phoneNumber,
        linkedId: phoneMatchPrimary.id,
        linkPrecedence: "secondary",
      });

      return res.status(200).json(newContact);
    } else {
      if (!emailMatch || !phoneMatch) {
        throw new Error("Unreachable, but TS doesn't know that");
      }

      // Now we have run into case where both match is present
      const phoneMatchPrimary =
        phoneMatch.linkPrecedence === "primary"
          ? phoneMatch
          : phoneMatch.linkedContact;

      if (!phoneMatchPrimary) {
        throw new Error("Sever Error");
      }

      const emailMatchPrimary =
        emailMatch.linkPrecedence === "primary"
          ? emailMatch
          : emailMatch.linkedContact;
      if (!emailMatchPrimary) {
        throw new Error("Sever Error");
      }

      if (phoneMatchPrimary.id === emailMatchPrimary.id) {
        return res.status(200).json(prepareOutput(phoneMatch));
      }

      if (phoneMatchPrimary.createdAt >= emailMatchPrimary.createdAt) {
        // email match primary have a higher rank and will stay
        await prisma.contact.updateMany({
          where: {
            id: {
              in: [
                phoneMatchPrimary.id,
                ...phoneMatchPrimary.linkingContacts.flatMap((lc) => lc.id),
              ],
            },
          },
          data: {
            linkedId: emailMatchPrimary.id,
            linkPrecedence: "secondary",
          },
        });
      } else {
        // phone match primary have a higher rank and will stay
        await prisma.contact.updateMany({
          where: {
            id: {
              in: [
                emailMatchPrimary.id,
                ...emailMatchPrimary.linkingContacts.flatMap((lc) => lc.id),
              ],
            },
          },
          data: {
            linkedId: phoneMatchPrimary.id,
            linkPrecedence: "secondary",
          },
        });
      }

      return res.status(200).json(prepareOutput(emailMatch));
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
      });
    }
    next(error);
  }
}
