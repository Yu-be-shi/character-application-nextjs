import { signIn } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div>
        <h1>{t("title")}</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/characters" });
          }}
        >
          <button type="submit">{t("googleSignIn")}</button>
        </form>
      </div>
    </main>
  );
}
