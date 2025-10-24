import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
  // SRP認証フローを有効化
  access: (allow) => [
    allow.authenticated().to(["read", "write"]),
  ],
});
