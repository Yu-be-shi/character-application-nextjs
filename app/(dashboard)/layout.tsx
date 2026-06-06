import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "12px 24px",
          background: "#fff",
          borderBottom: "1px solid #e9ecef",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "16px", marginRight: "auto" }}>
          キャラクター管理
        </span>
        <a href="/gallery">ギャラリー</a>
        <a href="/characters">マイキャラ</a>
        <span style={{ color: "#6c757d", fontSize: "13px" }}>
          {session.user?.name ?? session.user?.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            style={{
              padding: "6px 12px",
              border: "1px solid #ced4da",
              borderRadius: "6px",
              background: "transparent",
              color: "#6c757d",
            }}
          >
            ログアウト
          </button>
        </form>
      </nav>
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
