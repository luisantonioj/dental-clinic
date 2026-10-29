import { requireUser } from "@/server/auth";

export default async function Home() {
  const actor = await requireUser();
  return <main className="p-8 text-heading">Signed in as {actor.name}</main>;
}
