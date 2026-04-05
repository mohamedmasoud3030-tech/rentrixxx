import { Sandbox } from "@vercel/sandbox";

let sandbox;

try {
  sandbox = await Sandbox.create();

  const cmd = await sandbox.runCommand("echo", ["Hello from Vercel Sandbox!"]);
  console.log(await cmd.stdout());
} catch (error) {
  console.error("Unable to start Vercel Sandbox.");
  console.error("Run `npx sandbox create --connect` after linking your Vercel project.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (sandbox) {
    await sandbox.stop();
  }
}
