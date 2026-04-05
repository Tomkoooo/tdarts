import { toInitialUserContext } from "@/lib/auth/user-context-bootstrap";

describe("user-context-bootstrap", () => {
  it("returns undefined when server user is missing", () => {
    expect(toInitialUserContext(undefined)).toBeUndefined();
  });

  it("maps server user to client context shape", () => {
    expect(
      toInitialUserContext({
        _id: "u1",
        username: "user1",
        name: "User One",
        email: "user1@example.com",
        isVerified: true,
        isAdmin: false,
        profilePicture: "avatar.png",
        country: "HU",
        locale: "hu",
      }),
    ).toEqual({
      _id: "u1",
      username: "user1",
      name: "User One",
      email: "user1@example.com",
      isVerified: true,
      isAdmin: false,
      profilePicture: "avatar.png",
      country: "HU",
      locale: "hu",
    });
  });
});
