import { ContactWithRelations } from "../types/contact";
import { contactInclude } from "../utils/contact.util";
import { prisma } from "../utils/prisma";

export default class ContactService {
  static async identifyOrCreateContact(email: string, phoneNumber: string) {
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
      // No related contact exists
      const newContact = await ContactService.createContactAndReturnData({
        email,
        phoneNumber,
      });

      return newContact;
    } else if (!phoneMatch && emailMatch) {
      const emailMatchPrimary =
        emailMatch.linkPrecedence === "primary"
          ? emailMatch
          : emailMatch.linkedContact;

      if (!emailMatchPrimary) {
        throw new Error("Server Error");
      }

      const newContact = await ContactService.createContactAndReturnData({
        email,
        phoneNumber,
        linkedId: emailMatchPrimary.id,
        linkPrecedence: "secondary",
      });

      return newContact;
    } else if (phoneMatch && !emailMatch) {
      const phoneMatchPrimary =
        phoneMatch.linkPrecedence === "primary"
          ? phoneMatch
          : phoneMatch.linkedContact;

      if (!phoneMatchPrimary) {
        throw new Error("Server Error");
      }

      const newContact = await ContactService.createContactAndReturnData({
        email,
        phoneNumber,
        linkedId: phoneMatchPrimary.id,
        linkPrecedence: "secondary",
      });

      return newContact;
    } else {
      if (!emailMatch || !phoneMatch) {
        throw new Error("Server Error");
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
        return this.prepareOutput(phoneMatch);
      }

      if (phoneMatchPrimary.createdAt >= emailMatchPrimary.createdAt) {
        // email match primary have a higher rank and will stay
        await prisma.contact.updateMany({
          where: {
            id: {
              in: [
                phoneMatchPrimary.id,
                ...phoneMatchPrimary.linkingContacts.map((lc) => lc.id),
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
                ...emailMatchPrimary.linkingContacts.map((lc) => lc.id),
              ],
            },
          },
          data: {
            linkedId: phoneMatchPrimary.id,
            linkPrecedence: "secondary",
          },
        });
      }

      const data = await prisma.contact.findFirst({
        where: {
          id:
            phoneMatchPrimary.createdAt >= emailMatchPrimary.createdAt
              ? emailMatchPrimary.id
              : phoneMatchPrimary.id,
        },
        include: contactInclude,
      });

      if (!data) {
        throw new Error("Server Error");
      }

      return this.prepareOutput(data);
    }
  }

  static async createContactAndReturnData({
    email,
    phoneNumber,
    linkPrecedence,
    linkedId,
  }: {
    email?: string;
    phoneNumber?: string;
    linkPrecedence?: "primary" | "secondary";
    linkedId?: number;
  }) {
    const data: { email?: string; phoneNumber?: string; linkedId?: number } =
      {};
    if (email) data.email = email;
    if (phoneNumber) data.phoneNumber = phoneNumber;
    if (linkedId) data.linkedId = linkedId;

    const newContact = await prisma.contact.create({
      data: { linkPrecedence: linkPrecedence ?? "primary", ...data },
      include: contactInclude,
    });

    return this.prepareOutput(newContact);
  }

  static prepareOutput(data: ContactWithRelations) {
    const primaryContact =
      data.linkPrecedence === "primary" ? data : data.linkedContact;

    if (!primaryContact) {
      throw new Error("Primary Contact not found");
    }

    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails: Array.from(
          new Set(
            [
              primaryContact.email,
              ...primaryContact.linkingContacts.map((l) => l.email),
            ].filter((c) => c !== null)
          )
        ),
        phoneNumber: Array.from(
          new Set(
            [
              primaryContact.phoneNumber,
              ...primaryContact.linkingContacts.map((l) => l.phoneNumber),
            ].filter((c) => c !== null)
          )
        ),
        secondaryContactIds: [...primaryContact.linkingContacts.map((l) => l.id)],
      },
    };
  }
}
