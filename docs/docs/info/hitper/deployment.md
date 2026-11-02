---
sidebar_position: 6
title: 部署与维护
---

# 部署与维护

## 仓库边界

当前部署由两个仓库组成：

| 目录 | 内容 |
| --- | --- |
| `OpenSCOW/` | 门户、管理系统、认证与服务端源码，HITPER 品牌素材及文档 |
| `scow/` | 配套部署仓库 `myScowConfig`，包含 Compose、`config/` 和 `hitper/` 扩展 |

建议在同一父目录准备这两个仓库：

```sh
git clone https://github.com/herbertskyper/OpenSCOW.git OpenSCOW
git clone https://github.com/herbertskyper/myScowConfig.git scow
```

克隆并不等于已部署。配套仓库含当前站点的路径、地址、GPU UUID 和策略，不能直接作为另一套集群的通用配置；还需要自行准备数据库、LDAP、Slurm、适配器和平台认证服务。通用平台安装流程见[部署文档](../../deploy/index.md)。

## 运行依赖与配置

- 基础平台：现有 Compose 服务及其数据库、LDAP、Slurm 适配器。
- 构建工具：源码 `package.json` 指定 Node.js 20.15.0、pnpm 9.4.0；构建脚本使用 Docker 构建环境。
- 扩展服务：Python 3、PyYAML、cryptography，部署账号可使用 Docker 和用户级 systemd。
- 容器工作空间：Docker Engine 和预构建的 SSH 工作空间镜像。
- 虚拟机：QEMU、KVM、qemu-img、genisoimage，部署账号具有 `/dev/kvm` 读写权限。
- GPU 容器：宿主机 NVIDIA 驱动、NVIDIA Container Toolkit 与已配置的 Docker `nvidia` runtime。

部署前逐项检查：

| 文件或配置 | 需要核对的内容 |
| --- | --- |
| `scow/config/` | 平台域名或地址、认证、集群、适配器、品牌与作业策略 |
| `scow/config/portal.yaml` | `apps: true`、`shell: false`、`loginDesktop.enabled: false`、`uiExtension.url: /hitper` |
| `scow/config/mis.yaml` | `uiExtension.url: /hitper` |
| `scow/hitper/compose.yaml` | 源码相对路径、前后端镜像标签、网关到扩展的地址 |
| `scow/hitper/hitper.service` | 工作目录、Docker 组执行方式、监听地址、对外 SSH 主机和镜像 |
| `scow/hitper/capacity.yaml` | 个人 / 全局上限、系统保留量及专用 GPU UUID |
| `scow/hitper/compute.yaml` | Slurm 集群、运维连接、分区、QOS 和体验额度 |
| `scow/config/clusters/hpc01.yaml` | 门户提交策略与 Slurm 实际配置一致 |

当前扩展默认监听 `172.18.0.1:8765`，由网关反向代理 `/hitper/`。换环境时必须检查实际 Docker 网桥地址、网关可达性和防火墙，不要照搬这个地址。SSH 端口池为 22000–22255，对用户开放实例所需端口；网页可达不等于这些端口也可达。

## 准备工作空间环境

以下命令在已完成基础平台配置的 `scow/` 中执行。网络仅首次创建；已存在时先检查，不要删除正在使用的网络：

```sh
docker network inspect hitper-users
# 仅在网络不存在时创建
docker network create --opt com.docker.network.bridge.enable_icc=false hitper-users
```

构建管理员预置的三个 SSH 镜像：

```sh
docker build -t hitper/ssh-workspace:1 hitper/ssh
docker build -f hitper/ssh/Dockerfile.gpu \
  -t hitper/pytorch-workspace:2.1.1 hitper/ssh
docker build --build-arg BASE_IMAGE=nvidia/cuda:11.8.0-base-ubuntu22.04 \
  -f hitper/ssh/Dockerfile.gpu -t hitper/cuda-workspace:11.8 hitper/ssh
python3 hitper/prepare_vm.py
```

虚拟机准备脚本下载 Ubuntu 24.04 Minimal cloud image 并验证 SHA256。已部署环境不需要每次更新网页都重新下载镜像。

GPU 需要管理员先安装 NVIDIA Container Toolkit，并按主机现有 Docker 配置启用 `nvidia` runtime。变更前备份 Docker 配置，安排合适的重载或重启窗口；不要覆盖其他业务的 runtime 配置。可用以下命令检查：

```sh
nvidia-smi --query-gpu=uuid,name,memory.total --format=csv
docker info --format '{{json .Runtimes}}'
```

把专供工作空间使用的 GPU UUID 写入 `capacity.yaml`，不要填入同时被 Slurm 或其他系统调度的设备。未准备好 GPU runtime 时，平台仍可提供 CPU 工作空间。

## 构建、启动与访问

先按[管理员指南](./administration.md)核对 Slurm 策略和节点访问边界，再根据实际维护计划运行 `setup_compute.py`、`setup_resources.py`、`setup_login_access.py`。这些脚本会修改集群或 SSH 配置，其中资源配置脚本涉及节点排空和调度服务调整，不能作为每次发布的默认步骤；执行前阅读脚本并备份。

网页源码更新使用配套脚本：

```sh
sh hitper/build_web.sh "$HOME/OpenSCOW"
```

脚本输出 `hitper/scow-web:2`，而当前 Compose 网页服务引用 `hitper/scow-web:3`。发布时必须选择并统一标签：可在审核构建后把新产物标记为 Compose 所用标签，或修改 Compose 使用经验证的新标签；不要只构建 `:2` 就认为网页服务已更新。当前配置下，将新产物发布到网页标签的命令为：

```sh
docker tag hitper/scow-web:2 hitper/scow-web:3
```

镜像更新前记录旧镜像 ID 或保留回滚标签。`HITPER_BUILD_PROXY` 仅供构建阶段使用，需要代理时临时传入，不写入生产镜像。

安装并启动扩展服务：

```sh
mkdir -p ~/.config/systemd/user
cp hitper/hitper.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now hitper
docker compose -f docker-compose.yml -f hitper/compose.yaml \
  up -d gateway auth portal-web mis-web mis-server portal-server
```

已有服务更新 Python 或容量配置后，需执行 `systemctl --user restart hitper`；只有服务单元变化时才需重新复制并 `daemon-reload`。用户级 systemd 需由管理员为部署账号启用 lingering，保证注销后服务仍运行、开机可启动。

注册页为 `/hitper/register`，门户工作空间页从门户导航进入，管理员扩展页为 `/mis/extensions/platform-resources`。内部直达 `/hitper/extensions/workspaces` 仅是扩展页面地址，正常使用应从门户入口进入以复用登录状态。

## 日常检查与日志

```sh
systemctl --user status hitper --no-pager
journalctl --user -u hitper -n 100 --no-pager
docker compose -f docker-compose.yml -f hitper/compose.yaml ps
docker ps --filter label=hitper.managed=true
# 地址替换为实际扩展监听地址
curl --fail http://172.18.0.1:8765/hitper/health
```

用户提供诊断编号时，在扩展日志中查找对应操作。文件访问错误还可检查 `portal-web` 日志。健康检查返回正常仅表示服务在线，仍应验证创建、SSH、资源限制和回收流程。

## 备份与恢复

扩展数据默认位于 `scow/hitper/data/`：`hitper.sqlite` 保存用户资源、操作和用量记录，`storage/` 保存 Docker 数据盘与虚拟机系统盘，以实例编号命名的子目录保存实例配置，`images/` 保存虚拟机基础镜像；容器 SSH 主机密钥还位于独立 Docker 卷。平台的数据库、LDAP、集群个人目录和监控持久数据需按各自方案另行备份。

需要一致恢复点时，应安排维护窗口，暂停新申请和资源操作，通过受支持的流程停止工作空间，确认虚拟机磁盘与容器数据盘不再写入，再停止扩展服务。使用 SQLite backup API / `.backup` 或停服后的数据库副本，与同一时间点的数据盘、实例配置和 SSH 主机密钥一起备份。不要直接复制运行中的 qcow2、挂载中的 ext4 镜像后就认为获得了一致备份。

恢复前先核对数据库记录、磁盘和实际容器 / 用户 systemd 单元的一致性，防止 GPU 重复分配或数据卷错挂。启动服务后检查实例状态、挂载、SSH 主机密钥、配额与到期回收；主机重启后已有实例可能显示停止，需要用户启动。

## 发布与回滚

分别记录源码仓库和部署仓库的 commit，以及运行镜像标签 / ID。发布前确认两个仓库工作区状态，备份配置与数据；发布后用普通用户和管理员分别验证关键入口。

网页改动需要重建并更新镜像；扩展 Python 改动需要重启服务；单纯使用文档变更不需要重启业务。数据库已有自动加列迁移，回滚旧代码前仍需检查其与当前数据格式的兼容性，不要仅回退镜像就假设完成回滚。
