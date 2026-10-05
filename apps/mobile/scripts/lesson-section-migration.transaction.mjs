import { randomUUID } from "node:crypto";
import { link, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

const JournalName = ".lesson-section-migration.json";
const LessonPathPattern = /^lessons\/[0-9a-f-]{36}\.md$/;

function validatePlan(plan) {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error("Invalid section migration journal; no source files were overwritten");
  }
  const paths = new Set();
  for (const entry of plan) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      (entry.path !== "deck.json" && !LessonPathPattern.test(entry.path)) ||
      typeof entry.before !== "string" ||
      typeof entry.after !== "string" ||
      paths.has(entry.path)
    ) {
      throw new Error("Invalid section migration journal entry; no source files were overwritten");
    }
    paths.add(entry.path);
  }
  if (!paths.has("deck.json")) {
    throw new Error("Section migration journal has no manifest");
  }
}

async function applyPlan(directory, plan) {
  validatePlan(plan);
  // Check the entire source before resuming: preserve any edits made since the plan was saved.
  for (const entry of plan) {
    const current = await readFile(path.join(directory, entry.path), "utf8");
    if (current !== entry.before && current !== entry.after) {
      throw new Error(
        `Source changed during section migration: ${entry.path}. Restore it from the journal before retrying.`
      );
    }
  }
  for (const entry of plan) {
    const target = path.join(directory, entry.path);
    const current = await readFile(target, "utf8");
    if (current === entry.after) {
      continue;
    }
    if (current !== entry.before) {
      throw new Error(`Source changed during section migration: ${entry.path}`);
    }
    const temporary = `${target}.section-migration-${randomUUID()}.tmp`;
    try {
      const handle = await open(temporary, "wx");
      try {
        await handle.writeFile(entry.after, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  await rm(path.join(directory, JournalName), { force: true });
}

/** Resume a saved conversion with its original UUIDs after an interrupted multi-file write. */
export async function recoverLessonSectionMigration(directory) {
  let journal;
  try {
    journal = await readFile(path.join(directory, JournalName), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
  await applyPlan(directory, JSON.parse(journal));
  return true;
}

/** Save a recoverable plan before changing any source, then replace each file atomically. */
export async function writeLessonSectionMigration(directory, plan) {
  validatePlan(plan);
  const temporary = path.join(directory, `${JournalName}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx");
  try {
    try {
      await handle.writeFile(JSON.stringify(plan), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Publish a complete journal without replacing another process's saved plan.
    await link(temporary, path.join(directory, JournalName));
  } finally {
    await rm(temporary, { force: true });
  }
  await applyPlan(directory, plan);
}
