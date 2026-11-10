# GitHub Actions templates — inactive by default

The repository contains the full deployment and npm workflow source here, rather than in `.github/workflows`. The managed project's GitHub App has repository-content access but no workflow-write permission. These are ordinary source templates, not active Actions configurations. Creating/pushing this source repository therefore does not deploy the VPS, publish a container image, or publish the npm package.

After configuring your VPS/provider/domain and choosing to enable automation, use your own appropriately authorized GitHub login to copy `deploy.yml` and/or `npm-publish.yml` to `.github/workflows/` and commit them. Do not bypass or reuse a restricted App credential to do this. Enable only the templates you intend to run.

Deployment additionally requires `DEPLOY_ENABLED=true` in repository variables and the SSH/GHCR/domain secrets described in [the deployment guide](../DEPLOY-GITHUB-ACTIONS.md). Npm publication requires registration of the Trusted Publisher and `NPM_PUBLISH_ENABLED=true`. The npm template's manual dry-run path does not publish.

These templates have opt-in gates; they are not proof of live deployment or registry publication. Keep provider keys in the runtime secret store, never in workflow files.
