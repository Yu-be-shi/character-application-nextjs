import { describe, it, expect, vi, beforeEach } from "vitest";

// prisma をモックして DB なしで認可ロジックを検証する。
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { userCharacter: { findUnique } },
}));

import { isOwner, assertOwnership } from "@/lib/authz";

beforeEach(() => findUnique.mockReset());

describe("isOwner", () => {
  it("紐付けがあれば true を返す", async () => {
    findUnique.mockResolvedValue({ id: "uc1" });
    expect(await isOwner("u1", "c1")).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_characterId: { userId: "u1", characterId: "c1" } },
    });
  });

  it("紐付けが無ければ false を返す", async () => {
    findUnique.mockResolvedValue(null);
    expect(await isOwner("u1", "c1")).toBe(false);
  });
});

describe("assertOwnership", () => {
  it("所有者なら例外を投げない", async () => {
    findUnique.mockResolvedValue({ id: "uc1" });
    await expect(assertOwnership("u1", "c1")).resolves.toBeUndefined();
  });

  it("非所有者は Forbidden を投げる", async () => {
    findUnique.mockResolvedValue(null);
    await expect(assertOwnership("u1", "c1")).rejects.toThrow("Forbidden");
  });
});
