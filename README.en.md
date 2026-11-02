# HITPER Cloud HPC Platform

HITPER provides Slurm job management, interactive applications, GPU container workspaces, Ubuntu virtual machines, file access, and account and usage information. Users can submit cluster jobs through the web portal or request a resource-limited workspace and connect over SSH.

[中文](./README.md) · [User documentation (Chinese)](./docs/docs/info/hitper/index.md)

## Supported features

- Self-service registration with immediate platform login, background compute account setup, progress tracking, and retries.
- Slurm CPU and GPU jobs with account, partition, QOS, memory, and time restrictions.
- A unified interactive workspace menu containing existing applications, including VSCode and Emacs, and cloud workspaces.
- PyTorch 2.1.1 / CUDA 12.1 containers with GPU support, verified by actual CUDA tensor computation.
- Docker workspaces based on Ubuntu 22.04 / CUDA 11.8 or CPU-only Alpine 3.20.
- Ubuntu 24.04 QEMU / KVM virtual machines with a separate kernel and system disk; GPU passthrough is not currently supported.
- Independent CPU, GPU, and memory selection with image, resource pool, GPU model, quota, duration, and expiry information.
- Public-key SSH access to individual workspaces, with CPU and memory limits and access only to assigned GPUs. Ordinary users cannot SSH directly into cluster nodes.
- Persistent lifecycle operations, expiry cleanup, retained data volumes, SSH key management, and operation diagnostics.
- Personal resource and account views, an administrator-only global resource view in the management system, and server-side pagination.
- Blue HITPER branding and an H favicon, Prometheus metrics, Grafana dashboards, alerts, and sampled personal usage.

## Workspace templates

| Template | Environment | GPU | Persistent data |
| --- | --- | --- | --- |
| PyTorch 2.1.1 | Docker, PyTorch 2.1.1 / CUDA 12.1 | Whole-device allocation | `/home/hitper` |
| Docker · Ubuntu / CUDA | Docker, Ubuntu 22.04 / CUDA 11.8 | Whole-device allocation | `/home/hitper` |
| Docker · Alpine | Docker, Alpine 3.20 | CPU only | `/home/hitper` |
| Ubuntu VM 24.04 | QEMU / KVM, Ubuntu 24.04 | CPU only | Entire system disk |

The current deployment offers 1 / 2 / 4 / 8 CPU cores, 2 / 4 / 8 / 16 GiB of memory, a 50 GiB disk for new templates, and an initial duration of 1–24 hours. Actual choices depend on image readiness, remaining personal quota, and server-side admission checks. The default per-user GPU limit is one device.

Stopping a workspace retains its compute reservation and does not pause expiry. Successful release or expiry cleanup returns compute quota, while retained volumes continue to consume disk quota until deleted. Workspace usage is currently not charged against the Slurm account balance.

## Getting started

1. Register or log in to the platform.
2. Open the cloud workspace page under the interactive workspace menu and check compute onboarding progress.
3. Submit a Slurm job for scheduled cluster computation, or choose a workspace template and configure CPU, GPU, memory, and an SSH public key.
4. Wait for the running state and copy the complete SSH command from the instance card.
5. Store important files in the persistent location and release the instance when finished.

Compute account activation establishes Slurm permissions; it does not itself allocate hardware. Cloud workspaces use a separate resource pool and lifecycle, and their files are not automatically synchronized with the cluster home directory.

## Documentation

The following guides are currently available in Chinese:

- [Documentation index](./docs/docs/info/hitper/index.md)
- [Quick start](./docs/docs/info/hitper/quickstart.md)
- [Workspace usage](./docs/docs/info/hitper/workspaces.md)
- [Slurm and interactive applications](./docs/docs/info/hitper/slurm.md)
- [Administration](./docs/docs/info/hitper/administration.md)
- [Deployment and maintenance](./docs/docs/info/hitper/deployment.md)
- [Troubleshooting](./docs/docs/info/hitper/troubleshooting.md)

This repository contains application source, branding assets, and documentation. The registration and workspace extension lives in the `hitper/` directory of the companion [myScowConfig deployment repository](https://github.com/herbertskyper/myScowConfig). A complete deployment needs both repositories and site-specific configuration; cloning this source repository alone does not install the workspace extension.

## Origin and license

HITPER is developed and maintained by the HITPER project maintainers as a derivative of [OpenSCOW (Super Computing On Web)](https://github.com/PKUHPC/OpenSCOW), an open-source project from Peking University's High Performance Computing Platform. We thank the upstream team, retain its copyright notices, and follow [MulanPSL-2.0](./LICENSE). The repository also retains the upstream general deployment and configuration documentation.
