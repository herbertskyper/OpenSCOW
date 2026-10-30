jest.mock("src/config/clusters", () => ({
  configClusters: {
    hpc01: { jobPolicies: [{ accountPrefix: "hp_", partition: "trial", qos: "hitper_trial",
      maxCpus: 2, maxMemoryMb: 4096, maxTimeMinutes: 30 }]},
  },
}));

import { getJobPolicy, validateJobPolicy } from "src/utils/jobPolicy";

const request = { account: "hp_user", partition: "trial", qos: "hitper_trial", nodeCount: 1,
  coreCount: 2, gpuCount: 0, memory: "4096MB" };

it("accepts the trial resource boundary and leaves other accounts to the scheduler", () => {
  expect(() => validateJobPolicy("hpc01", request, 30)).not.toThrow();
  expect(getJobPolicy("hpc01", "project_account")).toBeUndefined();
  expect(() => validateJobPolicy("hpc01", { ...request, account: "project_account" }, 60)).not.toThrow();
});

it.each([
  { partition: "debug" }, { qos: "normal" }, { nodeCount: 2 }, { coreCount: 3 },
  { coreCount: 0 }, { coreCount: 1.5 }, { gpuCount: 1 }, { memory: "4097M" },
  { memory: "bad" }, { memory: undefined },
])("rejects a direct request outside the trial policy: %o", (changes) => {
  expect(() => validateJobPolicy("hpc01", { ...request, ...changes }, 30))
    .toThrow(expect.objectContaining({ code: 3 }));
});

it.each([0, 31, Number.NaN])("rejects invalid or excessive converted runtime %s", (minutes) => {
  expect(() => validateJobPolicy("hpc01", request, minutes)).toThrow(expect.objectContaining({ code: 3 }));
});
