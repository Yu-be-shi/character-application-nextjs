"use client";

import { useActionState } from "react";
import Link from "next/link";
import { GENDER_OPTIONS } from "@/lib/constants";

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
  submitLabel,
  cancelHref,
}: {
  action: CharacterFormAction;
  races: Race[];
  defaults?: CharacterFormDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<CharacterFormState, FormData>(
    action,
    {},
  );
  const fe = state.fieldErrors ?? {};
  const d = defaults ?? {};

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
        <label htmlFor="name" style={labelStyle}>名前 *</label>
        <input id="name" name="name" required maxLength={100} defaultValue={d.name ?? ""} style={inputStyle} />
        <FieldError message={fe.name} />
      </div>

      <div>
        <label htmlFor="raceId" style={labelStyle}>種族 *</label>
        <select id="raceId" name="raceId" required defaultValue={d.raceId ?? ""} style={inputStyle}>
          <option value="" disabled>種族を選択</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <FieldError message={fe.raceId} />
      </div>

      <div>
        <label htmlFor="gender" style={labelStyle}>性別 *</label>
        <select id="gender" name="gender" required defaultValue={d.gender ?? "unknown"} style={inputStyle}>
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <FieldError message={fe.gender} />
      </div>

      <div>
        <label htmlFor="birthDate" style={labelStyle}>生年月日</label>
        <input id="birthDate" name="birthDate" type="date" defaultValue={d.birthDate ?? ""} style={inputStyle} />
        <FieldError message={fe.birthDate} />
      </div>

      <div>
        <label htmlFor="birthPlace" style={labelStyle}>出身地</label>
        <input id="birthPlace" name="birthPlace" maxLength={150} placeholder="出身地" defaultValue={d.birthPlace ?? ""} style={inputStyle} />
        <FieldError message={fe.birthPlace} />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="heightCm" style={labelStyle}>身長 (cm)</label>
          <input id="heightCm" name="heightCm" type="number" min={1} step={1} placeholder="例: 170" defaultValue={d.heightCm ?? ""} style={inputStyle} />
          <FieldError message={fe.heightCm} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="weightKg" style={labelStyle}>体重 (kg)</label>
          <input id="weightKg" name="weightKg" type="number" min={1} step={1} placeholder="例: 60" defaultValue={d.weightKg ?? ""} style={inputStyle} />
          <FieldError message={fe.weightKg} />
        </div>
      </div>

      <div>
        <label htmlFor="bodyFatPercentage" style={labelStyle}>体脂肪率 (%)</label>
        <input id="bodyFatPercentage" name="bodyFatPercentage" type="number" min={0} max={100} step={0.1} placeholder="例: 15.0" defaultValue={d.bodyFatPercentage ?? ""} style={inputStyle} />
        <FieldError message={fe.bodyFatPercentage} />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeTop" style={labelStyle}>サイズ上 (cm)</label>
          <input id="sizeTop" name="sizeTop" type="number" min={1} step={1} placeholder="例: 90" defaultValue={d.sizeTop ?? ""} style={inputStyle} />
          <FieldError message={fe.sizeTop} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeMiddle" style={labelStyle}>サイズ中 (cm)</label>
          <input id="sizeMiddle" name="sizeMiddle" type="number" min={1} step={1} placeholder="例: 60" defaultValue={d.sizeMiddle ?? ""} style={inputStyle} />
          <FieldError message={fe.sizeMiddle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="sizeBottom" style={labelStyle}>サイズ下 (cm)</label>
          <input id="sizeBottom" name="sizeBottom" type="number" min={1} step={1} placeholder="例: 88" defaultValue={d.sizeBottom ?? ""} style={inputStyle} />
          <FieldError message={fe.sizeBottom} />
        </div>
      </div>

      <div>
        <label htmlFor="description" style={labelStyle}>説明</label>
        <textarea id="description" name="description" rows={5} defaultValue={d.description ?? ""} style={inputStyle} />
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
          {pending ? "送信中..." : submitLabel}
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
          キャンセル
        </Link>
      </div>
    </form>
  );
}
