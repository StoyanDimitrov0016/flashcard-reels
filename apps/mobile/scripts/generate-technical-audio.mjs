import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const stagingDirectory = path.join(root, "data", "generated_audio");
const assetDirectory = path.join(root, "data", "technical_flashcard_library", "audio");
const apiUrl = (process.env.AUDIO_GENERATOR_URL ?? "http://127.0.0.1:8765").replace(/\/$/, "");
const limit = Number.parseInt(process.env.AUDIO_LIMIT ?? "0", 10);
const startAt = Number.parseInt(process.env.AUDIO_START ?? "0", 10);
const force = process.env.AUDIO_FORCE === "1";

const cards = JSON.parse(await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8"));
if (!Array.isArray(cards) || cards.length === 0) {
  throw new Error("No flashcards were found in the technical library.");
}

const healthResponse = await fetch(`${apiUrl}/health`);
if (!healthResponse.ok) {
  throw new Error(
    `Audio API health check failed: ${healthResponse.status} ${healthResponse.statusText}`
  );
}

await mkdir(assetDirectory, { recursive: true });
await mkdir(stagingDirectory, { recursive: true });

const selectedCards = cards.slice(startAt, limit > 0 ? startAt + limit : undefined);
console.log(`Generating audio for ${selectedCards.length} card(s) through ${apiUrl}.`);

for (let index = 0; index < selectedCards.length; index += 1) {
  const card = selectedCards[index];
  const absoluteIndex = startAt + index + 1;
  await generateCardAudio(card);
  console.log(`[${absoluteIndex}/${cards.length}] ${card.id}`);
}

async function generateCardAudio(card) {
  const targetPath = path.join(assetDirectory, `${card.id}.mp3`);
  if (!force && (await fileExists(targetPath))) {
    return;
  }

  const stem = card.id;
  const response = await fetch(`${apiUrl}/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `${card.question}\n\n${card.answer}`,
      stem,
      suffix: ".md",
      outputDir: stagingDirectory,
      modelId: "kokoro",
      voice: "af_heart",
      speed: 1,
      wavOnly: false,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Could not create audio job for ${card.id}: ${response.status} ${await response.text()}`
    );
  }

  const created = await response.json();
  const job = await waitForJob(created.jobId);
  if (job.status !== "succeeded" || !job.result?.mp3Path) {
    throw new Error(`Audio job failed for ${card.id}: ${job.error ?? "missing MP3 result"}`);
  }

  await copyFile(job.result.mp3Path, targetPath);
  if (job.result.lessonOutputDir) {
    await rm(job.result.lessonOutputDir, { recursive: true, force: true });
  }
}

async function waitForJob(jobId) {
  while (true) {
    const response = await fetch(`${apiUrl}/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(
        `Could not read audio job ${jobId}: ${response.status} ${response.statusText}`
      );
    }
    const job = await response.json();
    if (job.status === "succeeded" || job.status === "failed") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, { flag: "r" });
    return true;
  } catch {
    return false;
  }
}
