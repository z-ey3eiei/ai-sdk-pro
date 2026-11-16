# Project deployment

The workspace already has a GitHub Actions deployment pilot for one registered repository. The project deployment path will use the existing GitHub login and imported repository records. DevStack's [Git auto-deploy](https://devstack.bid/docs/platform/github-app), [build executor](https://devstack.bid/docs/platform/build-executor), and [customer deploy](https://devstack.bid/docs/user-guide/customer-deploy) documentation define the reference behavior.

| Step | Implementation |
| --- | --- |
| Import or create a repository | Reuse workspace import. Add a setup flow that verifies a GitHub App installation and the user's authority before registering a deployment project. Template creation and source bundle upload need their own flows. |
| Accept GitHub events | `POST /api/github/webhook` authenticates the raw payload. Only explicitly enabled projects matching the repository and installation receive an intake record. The selected commit SHA is preserved. |
| Choose an environment | A push to the configured production branch targets production. Other branch pushes and same-repository PR updates target separate preview slots. Ignore fork PRs, tags and branch deletions in the build path. |
| Build and report progress | Add a worker that claims jobs atomically, enforces per-user and per-project quotas, and checks the current GitHub head before building or publishing. Persist job status and publish a GitHub commit check. Keep a bounded, redacted log per job. |
| Isolate execution | Static builds run in disposable isolated environments with CPU, memory, process, time and artifact limits, outbound policy, and a restricted dependency-install phase. The worker credential, Docker socket and platform database stay outside customer workloads. Preview credentials stay separate from production. |
| Publish and roll back | Store artifacts immutably and switch each environment to a successful release only after verification. Preserve the previous release for rollback. Use separate deployment hostnames and verify custom domain ownership before provisioning TLS or routing traffic. Dynamic runtimes require their own isolation and resource controls. |
| Show results | Extend the existing Deploy view to show commit, environment, status, URL and history. Add manual deploy and rollback with ownership checks. |

## Webhook intake

The webhook needs the `0007_deployment_intake.sql` migration and the runtime secret `GITHUB_DEPLOY_WEBHOOK_SECRET`. Store the same value in the GitHub App and app runtime. The route remains unavailable when the secret is missing. New project bindings default to automatic deployment disabled. A repeated delivery or an already recorded commit for the same project and slot does not duplicate the intake record.

The intake table records the deployment request. Build execution, retention, status updates and publishing require a consumer. Keep the pilot deployment workflow available until the new path has passed integration testing with an isolated staging repository.
