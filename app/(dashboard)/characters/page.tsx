import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { characterClient } from "@/lib/character-client";

export default async function CharactersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const characters = await characterClient.list();

  return (
    <main>
      <h1>キャラクター一覧</h1>
      <ul>
        {characters.map((c) => (
          <li key={c.id}>
            <a href={`/characters/${c.id}`}>{c.name}</a>
          </li>
        ))}
      </ul>
      <a href="/characters/new">新規作成</a>
    </main>
  );
}
