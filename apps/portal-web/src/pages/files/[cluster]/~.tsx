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

import { queryToString } from "@scow/lib-web/build/utils/querystring";
import { Button, Result, Space, Spin } from "antd";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { join } from "path";
import { useCallback } from "react";
import { useAsync } from "react-async";
import { useStore } from "simstate";
import { api } from "src/apis";
import { requireAuth } from "src/auth/requireAuth";
import { ClusterNotAvailablePage } from "src/components/errorPages/ClusterNotAvailablePage";
import { Redirect } from "src/components/Redirect";
import { useI18nTranslateToString } from "src/i18n";
import { ClusterInfoStore } from "src/stores/ClusterInfoStore";

export const HomeDirFileManagerPage: NextPage = requireAuth(() => true)(() => {

  const router = useRouter();
  const t = useI18nTranslateToString();

  const cluster = queryToString(router.query.cluster);

  const { currentClusters } = useStore(ClusterInfoStore);
  if (!currentClusters.find((x) => x.id === cluster)) {
    return <ClusterNotAvailablePage />;
  }

  const { data, isLoading, error, reload } = useAsync({
    promiseFn: useCallback(async () => api.getHomeDirectory({ query: { cluster } })
      .httpError(503, ({ requestId }) => { throw new Error(requestId); }), [cluster]),
  });

  if (isLoading) {
    return <Space><Spin /><span>{t("pages.files.connection.loading")}</span></Space>;
  }

  if (error) {
    return (
      <Result
        status="warning"
        title={t("pages.files.connection.failed")}
        subTitle={<Space direction="vertical">
          <span>{t("pages.files.connection.help", [cluster])}</span>
          {error.message && <span>{t("pages.files.connection.reference", [error.message])}</span>}
        </Space>}
        extra={<Space>
          <Button type="primary" onClick={reload}>{t("pages.files.connection.retry")}</Button>
          <Button href="/extensions/workspaces">{t("pages.files.connection.onboarding")}</Button>
        </Space>}
      />
    );
  }

  return <Redirect url={join("/files", cluster, data?.path ?? "")} />;
});

export default HomeDirFileManagerPage;

