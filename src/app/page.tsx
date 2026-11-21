import { Ask } from "@/components/Ask";
import { Metrics } from "@/components/Metrics";
import { DAILY_LIMIT, MAX_QUESTION } from "@/lib/quota";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Pregunta en español sobre una base de ventas ficticia</h1>
      <Ask dailyLimit={DAILY_LIMIT} maxLength={MAX_QUESTION} />
      <Metrics linkToCases />
    </>
  );
}
