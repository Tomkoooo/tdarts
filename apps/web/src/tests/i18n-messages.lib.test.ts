import { pickMessageNamespaces } from "@/i18n/messages";

describe("pickMessageNamespaces", () => {
  it("keeps only requested top-level namespaces", () => {
    const source = {
      Common: { hello: "world" },
      Tournament: { title: "Cup" },
      Footer: { contact: "x" },
    };

    const picked = pickMessageNamespaces(source, ["Common", "Tournament"]);
    expect(picked).toEqual({
      Common: { hello: "world" },
      Tournament: { title: "Cup" },
    });
  });

  it("returns original dictionary when namespaces are not provided", () => {
    const source = { Common: { hello: "world" } };
    expect(pickMessageNamespaces(source)).toEqual(source);
  });
});
