import { redirect } from "next/navigation";
import { getTeamId } from "@/lib/auth";

export default async function Home() {
  redirect((await getTeamId()) ? "/play" : "/login");
}
