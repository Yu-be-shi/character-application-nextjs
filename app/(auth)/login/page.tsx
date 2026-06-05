import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div>
        <h1>キャラクター管理</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/characters" });
          }}
        >
          <button type="submit">Google でログイン</button>
        </form>
      </div>
    </main>
  );
}
