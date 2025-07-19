import { describe, it, expect, vi, beforeEach } from "vitest";
import ContactService from "../src/services/contact.service";
import { prisma } from "../src/utils/__mocks__/prisma";
import { contactInclude } from "../src/utils/contact.util";
import { LinkPrecedence } from "@prisma/client";

vi.mock("../src/utils/prisma.ts");

describe("ContactService", () => {
  const email = "test@email.com";
  const phoneNumber = "123456789";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("identifyOrCreateContact", () => {
    it("should create a new contact if no contact exists", async () => {
      // Mock no existing contacts
      prisma.contact.findFirst.mockResolvedValueOnce(null); // email match
      prisma.contact.findFirst.mockResolvedValueOnce(null); // phone match

      const mockNewContact = {
        id: 1,
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: new Date(),
        deletedAt: null,
        updatedAt: new Date(),
        linkedContact: null,
        linkingContacts: [],
      };

      prisma.contact.create.mockResolvedValue(mockNewContact);

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          linkPrecedence: "primary",
          email,
          phoneNumber,
        },
        include: contactInclude,
      });

      expect(result).toEqual({
        contact: {
          primaryContactId: 1,
          emails: [email],
          phoneNumber: [phoneNumber],
          secondaryContactIds: [],
        },
      });
    });

    it("should create secondary contact when email match with a primary contact but no phone match", async () => {
      const diffPhone = "987654321";
      const primaryContact = {
        id: 1,
        email,
        phoneNumber: diffPhone,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      const newSecondaryContact = {
        id: 2,
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: primaryContact,
        linkingContacts: [],
      };

      // Mock email match exists, phone match doesn't
      prisma.contact.findFirst.mockResolvedValueOnce(primaryContact);
      prisma.contact.findFirst.mockResolvedValueOnce(null); // phone match
      primaryContact.linkingContacts = [
        newSecondaryContact as unknown as never,
      ];
      prisma.contact.create.mockResolvedValue({ ...newSecondaryContact });

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          linkPrecedence: "secondary",
          email,
          phoneNumber,
          linkedId: 1,
        },
        include: contactInclude,
      });

      expect(result).toEqual({
        contact: {
          primaryContactId: 1,
          emails: [email],
          phoneNumber: [diffPhone, phoneNumber],
          secondaryContactIds: [2],
        },
      });
    });

    it("should create secondary contact when email match with a secondary contact but no phone match", async () => {
      const diffPhone = "987654321";
      const primaryEmail = "primary@email.com";

      const primaryContact = {
        id: 1,
        email: primaryEmail,
        phoneNumber: diffPhone,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      const secondaryContact = {
        id: 2,
        email,
        phoneNumber: diffPhone,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: primaryContact,
        linkingContacts: [],
      };

      const newSecondaryContact = {
        id: 3,
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: primaryContact,
        linkingContacts: [],
      };

      primaryContact.linkingContacts = [
        newSecondaryContact as unknown as never,
        secondaryContact as unknown as never,
      ];

      prisma.contact.findFirst.mockResolvedValueOnce(secondaryContact);
      prisma.contact.findFirst.mockResolvedValueOnce(null);
      prisma.contact.create.mockResolvedValue(newSecondaryContact);

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          linkPrecedence: "secondary",
          email,
          phoneNumber,
          linkedId: 1,
        },
        include: contactInclude,
      });

      expect(result).toEqual({
        contact: {
          primaryContactId: 1,
          emails: [primaryEmail, email],
          phoneNumber: [diffPhone, phoneNumber],
          secondaryContactIds: [3, 2],
        },
      });
    });

    it("should create secondary contact when phone match exists but no email match", async () => {
      const primaryContact = {
        id: 1,
        email: "other@email.com",
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      const newSecondaryContact = {
        id: 2,
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: 1,
        createdAt: new Date(),
        deletedAt: null,
        updatedAt: new Date(),
        linkedContact: primaryContact,
        linkingContacts: [],
      };

      // Mock phone match exists, email match doesn't
      prisma.contact.findFirst.mockResolvedValueOnce(null); // email match
      prisma.contact.findFirst.mockResolvedValueOnce(primaryContact);
      prisma.contact.create.mockResolvedValue(newSecondaryContact);

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          linkPrecedence: "secondary",
          email,
          phoneNumber,
          linkedId: 1,
        },
        include: contactInclude,
      });

      expect(result.contact.primaryContactId).toBe(1);
      expect(result.contact.secondaryContactIds.includes(1)).toBeTruthy;
    });

    it("should return existing contact when both email and phone match same primary contact", async () => {
      const primaryContact = {
        id: 1,
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      // Mock both matches point to same primary contact
      prisma.contact.findFirst.mockResolvedValueOnce(primaryContact); // email match
      prisma.contact.findFirst.mockResolvedValueOnce(primaryContact); // phone match

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.create).not.toHaveBeenCalled();
      expect(prisma.contact.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        contact: {
          primaryContactId: 1,
          emails: [email],
          phoneNumber: [phoneNumber],
          secondaryContactIds: [],
        },
      });
    });

    it("should merge contacts when email match is older (has higher precedence)", async () => {
      const olderDate = new Date("2023-01-01");
      const newerDate = new Date("2023-01-02");

      const emailPrimary = {
        id: 1,
        email,
        phoneNumber: "111111111",
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: olderDate,
        updatedAt: olderDate,
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      const phonePrimary = {
        id: 2,
        email: "other@email.com",
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: newerDate,
        updatedAt: newerDate,
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      // Mock different primary contacts
      prisma.contact.findFirst.mockResolvedValueOnce(emailPrimary); // email match
      prisma.contact.findFirst.mockResolvedValueOnce(phonePrimary); // phone match

      const updatedEmailPrimary = {
        ...emailPrimary,
        linkingContacts: [
          {
            id: 2,
            email: "other@email.com",
            phoneNumber,
            createdAt: newerDate,
          },
        ],
      };

      prisma.contact.findFirst.mockResolvedValueOnce(updatedEmailPrimary); // final fetch

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [2], // phone primary and its linking contacts
          },
        },
        data: {
          linkedId: 1,
          linkPrecedence: "secondary",
        },
      });

      expect(result.contact.primaryContactId).toBe(1);
    });

    it("should merge contacts when phone match is older (has higher precedence)", async () => {
      const olderDate = new Date("2023-01-01");
      const newerDate = new Date("2023-01-02");

      const emailPrimary = {
        id: 1,
        email,
        phoneNumber: "111111111",
        linkPrecedence: LinkPrecedence.primary,
        deletedAt: null,
        linkedId: null,
        createdAt: newerDate,
        updatedAt: newerDate,
        linkedContact: null,
        linkingContacts: [],
      };

      const emailSecondary = {
        id: 2,
        email,
        phoneNumber: "211111111",
        linkPrecedence: LinkPrecedence.secondary,
        deletedAt: null,
        linkedId: 1,
        createdAt: newerDate,
        updatedAt: newerDate,
        linkedContact: emailPrimary,
        linkingContacts: [],
      };

      const phonePrimary = {
        id: 2,
        email: "other@email.com",
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
        createdAt: olderDate,
        updatedAt: olderDate,
        deletedAt: null,
        linkedContact: null,
        linkingContacts: [],
      };

      const phoneSecondary = {
        id: 4,
        email: "something@gmail.com",
        phoneNumber,
        linkPrecedence: LinkPrecedence.secondary,
        deletedAt: null,
        linkedId: 4,
        createdAt: newerDate,
        updatedAt: newerDate,
        linkedContact: emailPrimary,
        linkingContacts: [],
      };

      prisma.contact.findFirst.mockResolvedValueOnce(emailPrimary);
      prisma.contact.findFirst.mockResolvedValueOnce(phonePrimary);

      const updatedPhonePrimary = {
        ...phonePrimary,
        linkingContacts: [
          {
            id: 1,
            email,
            phoneNumber: "111111111",
            createdAt: newerDate,
          },
          phoneSecondary,
          emailSecondary,
        ],
      };

      prisma.contact.findFirst.mockResolvedValueOnce(updatedPhonePrimary);

      const result = await ContactService.identifyOrCreateContact(
        email,
        phoneNumber
      );

      expect(prisma.contact.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
        data: {
          linkedId: 2,
          linkPrecedence: "secondary",
        },
      });

      expect(result.contact.primaryContactId).toBe(2);
      expect(result.contact.secondaryContactIds.length).toBe(3);
    });

    describe("createContactAndReturnData", () => {
      it("should create primary contact with email and phone", async () => {
        const mockContact = {
          id: 1,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.primary,
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: null,
          linkingContacts: [],
        };

        prisma.contact.create.mockResolvedValue(mockContact);

        const result = await ContactService.createContactAndReturnData({
          email,
          phoneNumber,
        });

        expect(prisma.contact.create).toHaveBeenCalledWith({
          data: {
            linkPrecedence: "primary",
            email,
            phoneNumber,
          },
          include: contactInclude,
        });

        expect(result).toEqual({
          contact: {
            primaryContactId: 1,
            emails: [email],
            phoneNumber: [phoneNumber],
            secondaryContactIds: [],
          },
        });
      });

      it("should create secondary contact with linkedId", async () => {
        const primaryContact = {
          id: 1,
          email: "primary@email.com",
          phoneNumber: "111111111",
          linkPrecedence: "primary",
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          linkedContact: null,
          linkingContacts: [],
        };

        const mockContact = {
          id: 2,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.secondary,
          linkedId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: primaryContact,
          linkingContacts: [],
        };

        prisma.contact.create.mockResolvedValue(mockContact);

        const result = await ContactService.createContactAndReturnData({
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: 1,
        });

        expect(prisma.contact.create).toHaveBeenCalledWith({
          data: {
            linkPrecedence: "secondary",
            email,
            phoneNumber,
            linkedId: 1,
          },
          include: contactInclude,
        });

        expect(result.contact.primaryContactId).toBe(1);
      });

      it("should create contact with only email", async () => {
        const mockContact = {
          id: 1,
          email,
          phoneNumber: null,
          linkPrecedence: LinkPrecedence.primary,
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: null,
          linkingContacts: [],
        };

        prisma.contact.create.mockResolvedValue(mockContact);

        const result = await ContactService.createContactAndReturnData({
          email,
        });

        expect(prisma.contact.create).toHaveBeenCalledWith({
          data: {
            linkPrecedence: "primary",
            email,
          },
          include: contactInclude,
        });

        expect(result.contact.emails).toEqual([email]);
        expect(result.contact.phoneNumber).toEqual([]);
      });
    });

    describe("prepareOutput", () => {
      it("should prepare output for primary contact with linking contacts", async () => {
        const linkingContact1 = {
          id: 2,
          email: "secondary1@email.com",
          phoneNumber: "222222222",
          createdAt: new Date(),
        };

        const linkingContact2 = {
          id: 3,
          email: "secondary2@email.com",
          phoneNumber: "333333333",
          createdAt: new Date(),
        };

        const primaryContact = {
          id: 1,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.primary,
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: null,
          linkingContacts: [linkingContact1, linkingContact2],
        };

        const result = ContactService.prepareOutput(primaryContact);

        expect(result).toEqual({
          contact: {
            primaryContactId: 1,
            emails: [email, "secondary1@email.com", "secondary2@email.com"],
            phoneNumber: [phoneNumber, "222222222", "333333333"],
            secondaryContactIds: [2, 3],
          },
        });
      });

      it("should prepare output for secondary contact", async () => {
        const primaryContact = {
          id: 1,
          email: "primary@email.com",
          phoneNumber: "111111111",
          linkPrecedence: "primary",
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          linkedContact: null,
          linkingContacts: [],
        };

        const secondaryContact = {
          id: 2,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.secondary,
          linkedId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: primaryContact,
          linkingContacts: [],
        };

        const result = ContactService.prepareOutput(secondaryContact);

        expect(result.contact.primaryContactId).toBe(1);
        expect(result.contact.emails).toContain("primary@email.com");
      });

      it("should throw error when primary contact is not found", () => {
        const invalidContact = {
          id: 2,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.secondary,
          linkedId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: null, // This should cause the error
          linkingContacts: [],
        };

        expect(() => ContactService.prepareOutput(invalidContact)).toThrow(
          "Primary Contact not found"
        );
      });

      it("should filter out null emails and phone numbers", () => {
        const linkingContact = {
          id: 2,
          email: null,
          phoneNumber: null,
          createdAt: new Date(),
        };

        const primaryContact = {
          id: 1,
          email,
          phoneNumber,
          linkPrecedence: LinkPrecedence.primary,
          linkedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          linkedContact: null,
          linkingContacts: [linkingContact],
        };

        const result = ContactService.prepareOutput(primaryContact);

        expect(result.contact.emails).toEqual([email]);
        expect(result.contact.phoneNumber).toEqual([phoneNumber]);
      });
    });
  });
});
