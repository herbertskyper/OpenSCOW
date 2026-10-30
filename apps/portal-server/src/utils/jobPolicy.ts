import { ServiceError } from "@ddadaal/tsgrpc-common";
import { status } from "@grpc/grpc-js";
import { configClusters } from "src/config/clusters";

export const getJobPolicy = (cluster: string, account: string) =>
  configClusters[cluster]?.jobPolicies?.find((policy) => account.startsWith(policy.accountPrefix));

export const validateJobPolicy = (cluster: string, request: {
  account: string; partition: string; qos?: string; nodeCount: number;
  coreCount: number; gpuCount?: number; memory?: string;
}, maxTimeMinutes: number) => {
  const policy = getJobPolicy(cluster, request.account);
  if (!policy) { return; }

  const memoryMb = Number(request.memory?.replace(/MB?$/i, ""));
  if (request.partition !== policy.partition || request.qos !== policy.qos
      || request.nodeCount !== 1 || !Number.isInteger(request.coreCount) || request.coreCount < 1
      || request.coreCount > policy.maxCpus || (request.gpuCount ?? 0) !== 0
      || !Number.isFinite(memoryMb) || memoryMb <= 0 || memoryMb > policy.maxMemoryMb
      || !Number.isFinite(maxTimeMinutes) || maxTimeMinutes <= 0 || maxTimeMinutes > policy.maxTimeMinutes) {
    throw new ServiceError({
      code: status.INVALID_ARGUMENT,
      details: `此账户限用 ${policy.partition} / ${policy.qos}，单节点最多 ${policy.maxCpus} 核、`
        + `${policy.maxMemoryMb} MiB 内存、${policy.maxTimeMinutes} 分钟，不支持 GPU。`,
    });
  }
};
