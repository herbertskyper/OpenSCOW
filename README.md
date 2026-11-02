# HITPER 云超算平台

HITPER 面向计算用户和平台管理员，提供 Slurm 作业管理、交互式应用、GPU 容器工作空间、Ubuntu 虚拟机、文件管理、账户与用量查询。用户可以通过网页提交计算任务，也可以申请有资源限制的独立工作空间，再通过 SSH 连接开发环境。

[English](./README.en.md) · [使用文档](./docs/docs/info/hitper/index.md) · [快速上手](./docs/docs/info/hitper/quickstart.md)

## 已支持的功能

| 功能 | 当前能力 |
| --- | --- |
| 自助注册与计算开户 | 注册后即可登录；后台创建计算账户、配置资源策略和个人目录，支持查看进度与失败重试 |
| Slurm CPU / GPU 作业 | 网页提交、查询和管理作业；按账户、分区、QOS 校验 CPU、GPU、内存和运行时间 |
| 统一交互式入口 | 门户的“交互式工作空间”汇集已有交互式应用与云工作空间，保留 VSCode、Emacs 的原有应用入口 |
| PyTorch 工作空间 | PyTorch 2.1.1 / CUDA 12.1 容器，支持独占 GPU；已验证实际 CUDA 张量运算 |
| Docker 工作空间 | 可选择 Ubuntu 22.04 / CUDA 11.8 或 Alpine 3.20 镜像；前者支持 GPU，后者仅支持 CPU |
| Ubuntu 虚拟机 | Ubuntu 24.04、独立内核和系统盘、虚拟机内 sudo；当前仅支持 CPU |
| 独立资源申请 | CPU、GPU、内存分别选择；显示镜像、资源池、GPU 型号与显存、个人额度、使用时长和预计到期时间 |
| 受限 SSH 访问 | 工作空间独立端口、公钥认证；CPU / 内存受限，GPU 容器仅暴露获分配的设备；普通用户不能直接 SSH 登录集群节点 |
| 实例生命周期 | 创建、启动、停止、重启、续期、释放、到期回收；持久操作队列、操作阶段和诊断编号 |
| 持久数据与公钥 | 容器个人目录或虚拟机系统盘在释放后保留，可重新挂载或单独删除；支持保存 SSH 公钥和查看指纹 |
| 用户与管理员控制台 | 用户查看本人实例、额度、账户和记录；管理系统独立展示全局资源，列表支持服务端分页 |
| 品牌与监控 | 蓝色主题、HITPER 标识、蓝色 H 标签页图标；Prometheus 指标、Grafana 面板、告警及个人用量采样 |

## 两种使用方式

| 场景 | 入口 | 资源如何分配 |
| --- | --- | --- |
| 提交批处理、运行集群计算、使用已有交互式应用 | 门户作业管理 / 交互式工作空间 | 通过 Slurm 申请，由调度器按分区与 QOS 分配计算节点资源 |
| 获得持续可连接的开发、调试或训练环境 | 交互式工作空间 → 云工作空间 | 从独立工作空间资源池申请 Docker / KVM 实例，受个人与平台配额约束 |

“我的超算账户”用于准备 Slurm 账户及其权限；开通账户本身不会分配 CPU 或 GPU。云工作空间与 Slurm 作业使用不同的资源申请与生命周期管理流程，工作空间目录也不会自动同步到集群个人目录。

## 工作空间模板与规格

| 模板 | 环境 | GPU | 持久内容 |
| --- | --- | --- | --- |
| PyTorch 2.1.1 | Docker，PyTorch 2.1.1 / CUDA 12.1 | 支持，按整卡分配 | `/home/hitper` |
| Docker · Ubuntu / CUDA | Docker，Ubuntu 22.04 / CUDA 11.8 | 支持，按整卡分配 | `/home/hitper` |
| Docker · Alpine | Docker，Alpine 3.20 | 不支持 | `/home/hitper` |
| Ubuntu 虚拟机 24.04 | QEMU / KVM，Ubuntu 24.04 | 暂不支持 GPU 直通 | 完整系统盘 |

当前部署可选 CPU 为 1 / 2 / 4 / 8 核，内存为 2 / 4 / 8 / 16 GiB，新模板数据盘为 50 GiB，首次申请时长为 1–24 小时。实际可选项以镜像状态、个人剩余额度与服务端校验为准；单用户默认最多 1 张 GPU。

停止实例仍保留计算额度，到期时间继续计算；释放或到期回收成功后才归还计算资源。持久数据卷继续占用磁盘额度，只有单独删除数据卷才归还对应磁盘额度。工作空间用量目前不从 Slurm 账户余额扣费，也不作为收费账单。

## 从哪里开始

1. 打开平台登录页，注册或使用现有账号登录。
2. 在“交互式工作空间 → 云工作空间”查看计算开户进度。
3. 需要批处理计算时，通过作业管理提交 Slurm 作业；需要独立环境时，选择工作空间模板并配置 CPU、GPU、内存和 SSH 公钥。
4. 等待实例显示“运行中”，复制页面给出的完整 SSH 命令连接。
5. 将需要保留的文件放入对应持久目录，使用结束后释放实例。

完整步骤见[快速上手](./docs/docs/info/hitper/quickstart.md)和[工作空间使用指南](./docs/docs/info/hitper/workspaces.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [使用文档索引](./docs/docs/info/hitper/index.md) | 按用户、管理员与部署人员整理阅读顺序 |
| [快速上手](./docs/docs/info/hitper/quickstart.md) | 注册、登录、计算开户、首次创建与连接 |
| [工作空间使用](./docs/docs/info/hitper/workspaces.md) | 模板、CPU / GPU / 内存、SSH、数据卷与回收规则 |
| [Slurm 与交互式应用](./docs/docs/info/hitper/slurm.md) | 作业提交、CPU / GPU 策略、账户与工作空间的区别 |
| [管理员指南](./docs/docs/info/hitper/administration.md) | 管理入口、权限、资源配额、操作记录和监控 |
| [部署与维护](./docs/docs/info/hitper/deployment.md) | 源码与部署仓库关系、依赖、构建、配置、备份和更新 |
| [常见问题](./docs/docs/info/hitper/troubleshooting.md) | GPU、SSH、配额、数据保留、开户及访问故障 |

这些文档位于现有文档站的“功能介绍 → HITPER 使用指南”中，也可以直接在仓库中阅读。

## 仓库与部署组成

本仓库保存网页与服务端源码、品牌素材和文档。当前注册、云工作空间与运维扩展位于配套部署仓库 [myScowConfig](https://github.com/herbertskyper/myScowConfig) 的 `hitper/` 目录，运行配置位于该仓库的 `config/` 目录。

```text
OpenSCOW/                 # 当前源码仓库
├── apps/                 # 门户、管理系统、认证及服务端
├── libs/                 # 共享组件、配置和协议库
├── docs/docs/info/hitper/ # HITPER 使用与运维文档
└── docker/               # 镜像构建支持

scow/                     # 配套部署仓库，部署时与 OpenSCOW 相邻
├── config/               # 集群、认证、界面及策略配置
├── docker-compose.yml
└── hitper/               # 注册、工作空间、数据卷、容量与监控扩展
```

只克隆本源码仓库不会自动获得云工作空间扩展和完整部署配置。部署前请阅读[部署与维护](./docs/docs/info/hitper/deployment.md)，按实际网络、集群与硬件修改配置。

## 项目来源与许可

本项目由 HITPER 项目维护者基于北京大学高性能计算平台开源的 [OpenSCOW（Super Computing On Web）](https://github.com/PKUHPC/OpenSCOW) 二次开发。感谢上游团队的开源贡献；保留原有版权声明，遵循 [MulanPSL-2.0](./LICENSE)。上游通用部署与配置资料保留在本仓库的文档目录中。
