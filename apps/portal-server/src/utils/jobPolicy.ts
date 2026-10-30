import { ServiceError } from "@ddadaal/tsgrpc-common";
import { status } from "@grpc/grpc-js";
import { configClusters } from "src/config/clusters";

export const getJobPolicy = (cluster: string, account: string, partition?: string) =>
  configClusters[cluster]?.jobPolicies?.find((policy) => account.startsWith(policy.accountPrefix)
    && (!partition || policy.partition === partition));

export const validateJobPolicy = (cluster: string, request: {
  account: string; partition: string; qos?: string; nodeCount: number;
  coreCount: number; gpuCount?: number; memory?: string;
}, maxTimeMinutes: number) => {
  const defaultPolicy = getJobPolicy(cluster, request.account);
  if (!defaultPolicy) { return; }
  const policy = getJobPolicy(cluster, request.account, request.partition) ?? defaultPolicy;

  const memoryMb = Number(request.memory?.replace(/MB?$/i, ""));
  if (request.partition !== policy.partition || request.qos !== policy.qos
      || request.nodeCount !== 1 || !Number.isInteger(request.coreCount) || request.coreCount < 1
      || request.coreCount > policy.maxCpus || !Number.isInteger(request.gpuCount ?? 0)
      || (request.gpuCount ?? 0) < 0 || (request.gpuCount ?? 0) > (policy.maxGpus ?? 0)
      || !Number.isFinite(memoryMb) || memoryMb <= 0 || memoryMb > policy.maxMemoryMb
      || !Number.isFinite(maxTimeMinutes) || maxTimeMinutes <= 0 || maxTimeMinutes > policy.maxTimeMinutes) {
    throw new ServiceError({
      code: status.INVALID_ARGUMENT,
      details: `此账户限用 ${policy.partition} / ${policy.qos}，单节点最多 ${policy.maxCpus} 核、`
        + `${policy.maxMemoryMb} MiB 内存、${policy.maxTimeMinutes} 分钟、${policy.maxGpus ?? 0} 张 GPU。`,
    });
  }
};
