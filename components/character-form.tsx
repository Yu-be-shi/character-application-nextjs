"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { GENDERS } from "@/lib/constants";

export type Race = { id: string; name: string };

/** フォームの初期値（編集時のプリフィル用）。 */
export type CharacterFormDefaults = {
  name?: string;
  description?: string;
  raceId?: string;
  gender?: string;
  birthDate?: string; // "YYYY-MM-DD"
  birthPlace?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  sizeTop?: number;
  sizeMiddle?: number;
  sizeBottom?: number;
};

/** Server Action が返す状態。検証エラーはフィールド単位、その他は error に格納する。 */
export type CharacterFormState = {
  fieldErrors?: Record<string, string>;
  error?: string;
  /** 楽観ロック競合（412）時にサーバーが返す最新版。次回送信の If-Match に使う。 */
  latestVersion?: number;
};

export type CharacterFormAction = (
  state: CharacterFormState,
  formData: FormData,
) => Promise<CharacterFormState>;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "4px",
  color: "#495057",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ced4da",
  borderRadius: "6px",
  fontSize: "14px",
};
const errorTextStyle: React.CSSProperties = {
  color: "#dc3545",
  fontSize: "12px",
  marginTop: "4px",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={errorTextStyle}>{message}</p>;
}

export function CharacterForm({
  action,
  races,
  defaults,
  mode,
  cancelHref,
  withIdempotencyKey = false,
  version,
}: {
  action: CharacterFormAction;
  races: Race[];
  defaults?: CharacterFormDefaults;
  mode: "create" | "edit";
  cancelHref: string;
  withIdempotencyKey?: boolean;
  /** 編集時の楽観ロック版。412 後はサーバーが返した latestVersion で上書きされる。 */
  version?: number;
}) {
  const t = useTranslations("form");
  const tg = useTranslations("gender");
  const [state, formAction, pending] = useActionState<CharacterFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const d = defaults ?? {};

  // 二重送信防止用の冪等キー。送信結果（エラー含む）が返るたびに再発行する。
  // 固定キーのまま再送すると、サーバー側で補償削除された前回の作成レスポンスを
  // API が再生し、存在しないキャラクターに紐付いてしまう（幽霊キャラ）ため。
  // レンダー中に crypto.randomUUID() を呼ぶと SSR とクライアントで値がズレて
  // hydration mismatch になるため、マウント後（と結果が返るたび）に発行する。
  // ハイドレーション前の送信ではキーが空＝重複排除なしのフォールバックになる。
  const [idemKey, setIdemKey] = useState("");
  useEffect(() => {
    if (withIdempotencyKey) setIdemKey(crypto.randomUUID());
  }, [withIdempotencyKey, state]);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {withIdempotencyKey && <input type="hidden" name="idempotencyKey" value={idemKey} />}
      {version != null && (
        <input type="hidden" name="version" value={state.latestVersion ?? version} />
      )}
      {state.error && (
        <p
          role="alert"
          style={{
            background: "#fff5f5",
            border: "1px solid #f5c2c7",
            color: "#dc3545",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "13px",
          }}
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="name" style={labelStyle}>
          {t("name")}
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={d.name ?? ""}
          style={inputStyle}
        />
        <FieldError message={fe.name} />
      </div>

      <div>
        <label htmlFor="raceId" style={labelStyle}>
          {t("race")}
        </label>
        <select id="raceId" name="raceId" required defaultValue={d.raceId ?? ""} style={inputStyle}>
          <option value="" disabled>
            {t("raceSelect")}
          </option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <FieldError message={fe.raceId} />
      </div>

      <div>
        <label htmlFor="gender" style={labelStyle}>
          {t("gender")}
        </label>
        <select
          id="gender"
          name="gender"
          required
          defaultValue={d.gender ?? "unknown"}
          style={inputStyle}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {tg(g)}
            </option>
          ))}
        </select>
        <FieldError message={fe.gender} />
      </div>

      <div>
        <label htmlFor="birthDate" style={labelStyle}>
          {t("birthDate")}
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={d.birthDate ?? ""}
          style={inputStyle}
        />
        <FieldError message={fe.birthDate} />
      </div>

      <div>
        <label htmlFor="birthPlace" style={labelStyle}>
          {t("birthPlace")}
        </label>
        <input
          id="birthPlace"
          name="birthPlace"
          maxLength={150}
          defaultValue={d.birthPlace ?? ""}
          style={inputStyle}
        />
        <FieldError message={fe.birthPlace} />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="heightCm" style={labelStyle}>
            {t("height")}
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            min={1}
            step={1}
            placeholder="170"
            defaultValue={d.heightCm ?? ""}
            style={inputStyle}
          />
          <FieldError message={fe.heightCm} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="weightKg" style={labelStyle}>
            {t("weight")}
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            min={1}
            step={1}
            placeholder="60"
            defaultValue={d.weightKg ?? ""}
            style={inputStyle}
          />
          <FieldError message={fe.weightKg} />
        </div>
      </div>

      <div>
        <label htmlFor="bodyFatPercentage" style={labelStyle}>
          {t("bodyFat")}
        </label>
        <input
          id="bodyFatPercentage"
          name="bodyFatPercentage"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="15.0"
          defaultValue={d.bodyFatPercentage ?? ""}
          style={inputStyle}
        />
        <FieldError message={fe.bodyFatPercentage} />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeTop" style={labelStyle}>
            {t("sizeTop")}
          </label>
          <input
            id="sizeTop"
            name="sizeTop"
            type="number"
            min={1}
            step={1}
            placeholder="90"
            defaultValue={d.sizeTop ?? ""}
            style={inputStyle}
          />
          <FieldError message={fe.sizeTop} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeMiddle" style={labelStyle}>
            {t("sizeMiddle")}
          </label>
          <input
            id="sizeMiddle"
            name="sizeMiddle"
            type="number"
            min={1}
            step={1}
            placeholder="60"
            defaultValue={d.sizeMiddle ?? ""}
            style={inputStyle}
          />
          <FieldError message={fe.sizeMiddle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeBottom" style={labelStyle}>
            {t("sizeBottom")}
          </label>
          <input
            id="sizeBottom"
            name="sizeBottom"
            type="number"
            min={1}
            step={1}
            placeholder="88"
            defaultValue={d.sizeBottom ?? ""}
            style={inputStyle}
          />
          <FieldError message={fe.sizeBottom} />
        </div>
      </div>

      <div>
        <label htmlFor="description" style={labelStyle}>
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={d.description ?? ""}
          style={inputStyle}
        />
        <FieldError message={fe.description} />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 20px",
            background: pending ? "#9ec5fe" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? t("submitting") : t(mode === "create" ? "submitCreate" : "submitUpdate")}
        </button>
        <Link
          href={cancelHref}
          style={{
            padding: "10px 20px",
            border: "1px solid #ced4da",
            borderRadius: "6px",
            color: "#495057",
          }}
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
