import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "build/compute_eligibility_clean.arcis",
  "build/compute_eligibility_clean.idarc",
  "build/compute_eligibility_clean.weight",
  "target/idl/claimrail.json",
  "target/deploy/claimrail.so",
];

for (const file of requiredFiles) {
  await access(file);
}

const idarc = JSON.parse(await readFile("build/compute_eligibility_clean.idarc", "utf8"));
const idl = JSON.parse(await readFile("target/idl/claimrail.json", "utf8"));

if (idarc.name !== "compute_eligibility_clean") {
  throw new Error(`Unexpected encrypted instruction name: ${idarc.name}`);
}

if (!idl.instructions?.some((ix) => ix.name === "compute_eligibility" || ix.name === "computeEligibility")) {
  throw new Error("Claimrail IDL does not include computeEligibility");
}

if (
  !idl.instructions?.some(
    (ix) =>
      ix.name === "compute_eligibility_clean_callback" ||
      ix.name === "computeEligibilityCleanCallback"
  )
) {
  throw new Error("Claimrail IDL does not include computeEligibilityCallback");
}

console.log("Claimrail Arcium smoke test passed");
