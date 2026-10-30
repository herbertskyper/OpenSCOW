/**
 * Copyright (c) 2022 Peking University and Peking University Institute for Computing and Digital Economy
 * OpenSCOW is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *          http://license.coscl.org.cn/MulanPSL2
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
 * MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 */

import { typeboxRouteSchema } from "@ddadaal/next-typed-api-routes-runtime";
import { asyncUnaryCall } from "@ddadaal/tsgrpc-client";
import { Metadata, status } from "@grpc/grpc-js";
import { FileServiceClient } from "@scow/protos/build/portal/file";
import { Type } from "@sinclair/typebox";
import { randomUUID } from "crypto";
import { authenticate } from "src/auth/server";
import { getClient } from "src/utils/client";
import { route } from "src/utils/route";
import { handlegRPCError } from "src/utils/server";

export const GetHomeDirectorySchema = typeboxRouteSchema({
  method: "GET",

  query: Type.Object({
    cluster: Type.String(),
  }),

  responses: {
    200: Type.Object({ path: Type.String() }),
    400: Type.Object({ code: Type.Literal("INVALID_CLUSTER") }),
    503: Type.Object({ code: Type.Literal("FILE_SERVICE_UNAVAILABLE"), requestId: Type.String() }),
  },
});

const auth = authenticate(() => true);

export default route(GetHomeDirectorySchema, async (req, res) => {

  const info = await auth(req, res);

  if (!info) { return; }

  const { cluster } = req.query;

  const client = getClient(FileServiceClient);
  const unavailable = (error: Error) => {
    const requestId = randomUUID();
    console.error("File service unavailable", { requestId, cluster, userId: info.identityId, error });
    return { 503: { code: "FILE_SERVICE_UNAVAILABLE", requestId } } as const;
  };

  return asyncUnaryCall(client, "getHomeDirectory", {
    cluster, userId: info.identityId,
  }, { metadata: new Metadata(), options: { deadline: Date.now() + 45000 } })
    .then(({ path }) => ({ 200: { path } }), handlegRPCError({
      [status.NOT_FOUND]: () => ({ 400: { code: "INVALID_CLUSTER" as const } }),
      [status.INTERNAL]: unavailable,
      [status.UNKNOWN]: unavailable,
      [status.UNAVAILABLE]: unavailable,
      [status.DEADLINE_EXCEEDED]: unavailable,
    }));


});
