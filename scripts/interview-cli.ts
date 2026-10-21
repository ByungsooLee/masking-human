#!/usr/bin/env npx tsx
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { startInterview, submitParticipantMessage } from "../src/lib/interview/engine";
import { getInterviewProvider } from "../src/lib/interview/providers";
import type { InterviewThemeId } from "../src/lib/interview/types";

const theme = (process.argv[2]?.toUpperCase() ?? "A") as InterviewThemeId;

async function main() {
  const provider = getInterviewProvider(
    process.env.INTERVIEW_PROVIDER === "openai" ? "openai" : "mock",
  );
  const rl = readline.createInterface({ input, output });

  console.log(`THE HUMAN MIRROR — CLI interview (theme ${theme}, provider ${provider.name})`);
  const started = await startInterview(theme, provider);
  let session = started.session;
  console.log(`\nAI: ${started.assistantText}\n`);

  while (session.status === "active") {
    const line = await rl.question("You (or :skip :topic :end): ");
    let command: "none" | "skip" | "change_topic" | "end" = "none";
    let text = line;
    if (line.startsWith(":skip")) {
      command = "skip";
      text = line.replace(":skip", "").trim();
    } else if (line.startsWith(":topic")) {
      command = "change_topic";
      text = line.replace(":topic", "").trim();
    } else if (line.startsWith(":end")) {
      command = "end";
      text = line.replace(":end", "").trim();
    }

    const result = await submitParticipantMessage(session, text, command, provider);
    session = result.session;
    console.log(`\nAI: ${result.assistantText}\n`);
    if (result.usedFallback) console.log("(used safe fallback question)\n");
  }

  rl.close();
  console.log("Session finished:", session.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
