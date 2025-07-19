import { Prisma } from "@prisma/client";
import { contactInclude } from "../utils/contact.util";

export type ContactWithRelations = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;
