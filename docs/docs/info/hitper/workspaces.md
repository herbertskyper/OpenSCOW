---
sidebar_position: 3
title: 工作空间使用
---

# 工作空间使用

## 选择模板

| 模板 | 适用场景 | GPU | 权限与持久范围 |
| --- | --- | --- | --- |
| PyTorch 2.1.1 / CUDA 12.1 | 深度学习训练、推理、PyTorch 开发 | 支持整卡申请 | 普通 `hitper` 用户；保留 `/home/hitper` |
| Docker · Ubuntu 22.04 / CUDA 11.8 | 通用 CUDA 应用和 Linux 开发 | 支持整卡申请 | 普通 `hitper` 用户；保留 `/home/hitper` |
| Docker · Alpine 3.20 | 轻量命令行环境 | 不支持 | 普通 `hitper` 用户；保留 `/home/hitper` |
| Ubuntu 虚拟机 24.04 | 需要独立内核、sudo 或系统级软件的环境 | 暂不支持直通 | 可在虚拟机内 sudo；保留整个系统盘 |

Docker 卡片的创建弹窗可切换 Ubuntu / CUDA 和 Alpine。平台仅开放管理员预置的镜像，不接受用户填写任意镜像名、特权启动参数或宿主机挂载。PyTorch 模板已有 PyTorch；通用 CUDA 模板不保证预装同样的 Python 包。

## 配置资源

| 项目 | 当前配置 |
| --- | --- |
| CPU | 1 / 2 / 4 / 8 核 |
| GPU | 0 / 1 / 2 卡选项，受模板和额度限制；单用户默认最多 1 卡 |
| 内存 | 2 / 4 / 8 / 16 GiB |
| 数据盘 | 新模板固定 50 GiB，旧 8 / 16 GiB 实例保持兼容 |
| 首次时长 | 1–24 小时 |
| 每用户总额度 | 最多 3 个实例、8 核 CPU、1 张 GPU、16.5 GiB 内存预留、150 GiB 数据盘 |

数值来自当前部署配置，不是不可修改的产品上限。容器额外预留 128 MiB，虚拟机额外预留 384 MiB 运行开销，因此额度中的内存使用量会高于实例所选内存。页面会禁用超出个人额度的选项；最终还会检查平台预留、主机余量、镜像和 GPU 运行环境。

CPU 使用量受 cgroup / systemd 配额限制，不代表物理核心独占。内存与容器 swap 有硬限制。GPU 按 UUID 分配整张设备，容器只看到分配的 GPU；0 GPU 容器不会暴露主机 GPU。GPU 型号和可用显存以弹窗展示为准。

## SSH 与开发环境

实例运行后复制页面完整 SSH 命令，使用申请时公钥对应的私钥连接。容器和虚拟机登录用户均为 `hitper`，端口由实例分配。现有实例的登录公钥不会随公钥列表修改而自动更换；需要更换时，先备份数据，再根据模板的数据卷复用规则处理。

容器系统层只读，不提供 sudo、Docker socket 或宿主机管理权限。Python 依赖应放在个人目录，例如：

```sh
python3 -m venv ~/venvs/project
. ~/venvs/project/bin/activate
python -m pip install 需要的包名
```

上例适用于提供 Python venv 的模板；Alpine 模板不保证相同的 Python 环境。PyTorch 模板如需在个人虚拟环境中复用已安装的 PyTorch，可在创建虚拟环境时使用 `--system-site-packages`。安装包需要工作空间具备相应网络访问条件。需要系统级安装时选择 Ubuntu 虚拟机。

已有支持 SSH 的开发工具可以使用实例连接信息；平台也保留集群侧原有 VSCode、Emacs 交互式应用。工作空间不会自动启动 Jupyter 等 Web 服务。

## 验证 GPU

GPU 容器中可以运行：

```sh
nvidia-smi -L
```

PyTorch 模板可进一步验证计算：

```python
import torch

print(torch.__version__, torch.version.cuda)
print("GPU 数量:", torch.cuda.device_count())
assert torch.cuda.is_available()
tensor = torch.ones((128, 128), device="cuda")
result = tensor @ tensor
torch.cuda.synchronize()
print(result[0, 0].item())  # 128.0
```

必须在申请了 GPU 的 PyTorch 实例中执行。0 GPU 实例显示无可用 CUDA 设备属于预期结果。

## 生命周期与额度

| 操作或状态 | 计算额度 | 数据 | 时间规则 |
| --- | --- | --- | --- |
| 运行中 | 保留 | 持久盘可使用 | 持续计时 |
| 停止 | 仍保留 | 持久盘保留 | 不暂停到期时间 |
| 启动 / 重启 | 使用原预留资源 | 保留持久盘 | 不自动延长期限 |
| 创建失败 | 保留预留，供诊断与释放 | 视已执行阶段而定 | 仍需关注到期与操作状态 |
| 释放 / 到期回收成功 | 归还 CPU / GPU / 内存 | 持久盘保留 | 原实例不能继续使用 |
| 永久删除数据卷 | 不涉及计算额度 | 数据不可恢复地删除 | 归还对应磁盘额度 |

页面提供“续期 1 小时”。接口允许每次续期 1–24 小时，但续期后剩余时间最多 24 小时，单实例累计使用最多 7 天；到期实例不能续期。资源归还以释放或回收操作成功为准，单纯提交请求不代表已经完成。

## 数据卷复用与文件传输

- Docker 仅保留 `/home/hitper`；临时目录不属于持久数据，内存盘内容不应作为备份。
- 虚拟机保留整个系统盘，平台重建实例不会自动更改盘内旧登录公钥。
- 复用数据卷需属于本人、未绑定其他活动实例，并匹配实例类型和大小；虚拟机还要求使用原公钥。
- 被保留的数据卷继续计入个人与平台磁盘预留。释放实例不等于删除数据。
- 工作空间目录和门户文件管理中的集群个人目录互相独立。可在自己的电脑通过 `scp` / SFTP 中转文件，连接参数使用实例页面的主机、端口与 `HostKeyAlias`。

```sh
# scp 的端口参数是大写 -P；示例中的占位值需替换
scp -i ~/.ssh/id_ed25519_hitper -P 实例端口 \
  -o HostKeyAlias=hitper-实例编号 \
  ./dataset.txt hitper@工作空间主机:/home/hitper/
```

平台目前没有工作空间快照、跨用户共享卷或自动备份功能，请另行保存重要数据。
