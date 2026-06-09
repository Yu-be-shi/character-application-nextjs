// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/ja.json";
import { CharacterForm, type CharacterFormState } from "@/components/character-form";

const noopAction = async (): Promise<CharacterFormState> => ({});

function renderForm(mode: "create" | "edit") {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <CharacterForm
        action={noopAction}
        races={[{ id: "11111111-1111-1111-1111-111111111111", name: "人間" }]}
        mode={mode}
        cancelHref="/characters"
      />
    </NextIntlClientProvider>,
  );
}

describe("CharacterForm", () => {
  it("主要なラベルと種族の選択肢を表示する", () => {
    renderForm("create");
    expect(screen.getByText("名前 *")).toBeInTheDocument();
    expect(screen.getByText("種族 *")).toBeInTheDocument();
    expect(screen.getByText("性別 *")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "人間" })).toBeInTheDocument();
  });

  it("mode に応じて送信ボタンのラベルが変わる", () => {
    const { unmount } = renderForm("create");
    expect(screen.getByRole("button", { name: "作成する" })).toBeInTheDocument();
    unmount();
    renderForm("edit");
    expect(screen.getByRole("button", { name: "更新する" })).toBeInTheDocument();
  });
});
