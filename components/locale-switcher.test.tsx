// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/ja.json";
import { LocaleSwitcher } from "@/components/locale-switcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("LocaleSwitcher", () => {
  it("ロケール選択肢(日本語/English)を表示し、現在ロケールが選択されている", () => {
    render(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("ja");
    expect(screen.getByText("日本語")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });
});
