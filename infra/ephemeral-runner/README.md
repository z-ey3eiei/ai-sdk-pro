# Dedicated GitHub Actions runner

Use a disposable VM and a private runner-control repository. Mirror only the trusted orchestration workflow into that repository. Start with `runner-smoke.yml` at `.github/workflows/runner-smoke.yml`. The smoke job runs no checkout, uses no repository secrets, and is manual.

Install the official GitHub Actions runner on a fresh VM as a dedicated unprivileged account. Keep the VM off the production private network, with no production mounts, credentials, Docker socket, or cloud metadata access. The host network must deny private and link-local destinations and restrict outbound traffic to the GitHub runner endpoints needed for the selected job. Before adding any tenant build workload, verify those rules from inside the runner environment.

Run `mint-jit.sh OWNER/PRIVATE_REPOSITORY` on a trusted controller with authenticated GitHub CLI and jq. It requires repository Administration write permission. Pipe its output over SSH directly into `run-once.sh /path/to/actions-runner` on the build VM. Route logs to the controller, never the JIT configuration. Dispatch the smoke workflow and destroy the VM when the job completes or times out. Use a fresh VM per job.

This is the control-runner smoke path. Tenant builds and server runtimes require their own sandbox boundary. Keep the existing GitHub-hosted static build path active until the dedicated runner and its network policy pass verification.
