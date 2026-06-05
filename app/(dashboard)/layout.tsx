import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <nav>
        <a href="/characters">キャラクター</a>
        <a href="/profile">プロフィール</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}
