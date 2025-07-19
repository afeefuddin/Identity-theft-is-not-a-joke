export const contactInclude = {
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
