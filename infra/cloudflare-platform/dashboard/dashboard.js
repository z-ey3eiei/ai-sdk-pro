const get = (id) => document.getElementById(id);
const notice = get('notice');
const revise = (form, callback) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  perform(event.submitter, () => callback(new FormData(form)));
});
let selected;
let account;
const installation = get('import').elements.installation;
const repository = get('import').elements.repository;

async function api(path, method = 'GET', payload) {
  const response = await fetch(`/api/${path}`, {
    method, headers: payload ? { 'Content-Type':'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!response.ok) throw Error((await response.json()).error || `HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.headers.get('content-type')?.startsWith('text/plain') ? response.text() : response.json();
}

async function perform(button, action) {
  notice.textContent = '';
  if (button) button.disabled = true;
  try { await action(); }
  catch (error) { notice.textContent = error.message; }
  finally { if (button) button.disabled = false; }
}
function action(label, handle) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => perform(button, handle));
  return button;
}
function row(label, ...actions) {
  const item = document.createElement('div');
  item.className = 'item';
  const title = document.createElement('span');
  title.textContent = label;
  item.append(title, ...actions);
  return item;
}
function applyRepoHint() {
  const hint = new URLSearchParams(location.search).get('repo');
  if (!hint) return false;
  for (const option of repository.options) {
    if (option.value === hint) {
      repository.value = hint;
      const nameField = get('import').elements.name;
      if (nameField && !nameField.value) {
        nameField.value = hint.includes('/') ? hint.split('/').pop() : hint;
      }
      return true;
    }
  }
  return false;
}
async function repoOptions() {
  repository.replaceChildren();
  if (!installation.value) return;
  const {items, total} = await api(`repos?installation=${installation.value}`);
  for (const repo of items) repository.add(new Option(repo.full_name, repo.full_name));
  if (total > items.length) {
    for (let page = 2; page <= Math.min(10, Math.ceil(total / 30)); page++) {
      const more = await api(`repos?installation=${installation.value}&page=${page}`);
      for (const repo of more.items) repository.add(new Option(repo.full_name, repo.full_name));
    }
  }
  applyRepoHint();
}
async function loadRepos() {
  const {items} = await api('repos');
  installation.replaceChildren(...items.map((entry) => new Option(entry.name, entry.id)));
  await repoOptions();
}
async function loadProjects() {
  const projects = await api('projects');
  get('projects').replaceChildren(...projects.map((project) => row(`${project.name} · ${project.repo_full_name}`, action('เปิด', () => openProject(project)))));
  return projects;
}
const route = (path) => `projects/${selected.id}${path ? '/' + path : ''}`;
async function openProject(project) {
  selected = project;
  get('project-name').textContent = project.name;
  get('details').hidden = false;
  get('logs').hidden = true;
  get('verification').hidden = true;
  const fields = get('settings').elements;
  for (const key of ['branch','framework','build_command','output_dir']) fields[key].value = project[key] ?? '';
  fields.auto_deploy.checked = Boolean(project.auto_deploy);
  await Promise.all([history(), loadVars(), loadDomains()]);
}
async function history() {
  const items = await api(route('deployments'));
  get('history').replaceChildren(...items.map((deploy) => {
    const link = document.createElement('a');
    if (deploy.status === 'success' && deploy.url) {
      const url = new URL(deploy.url);
      if (url.protocol === 'https:' && url.hostname.endsWith('.' + account.project_domain)) {
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'เปิดเว็บ';
      }
    }
    return row(`${deploy.commit_sha.slice(0,7)} · ${deploy.status}`, link, action('Build logs', async () => {
      const logs = get('logs');
      logs.textContent = await api(route(`logs/${deploy.id}`));
      logs.hidden = false;
    }));
  }));
}
async function loadVars() {
  const items = await api(route('env'));
  get('variables').replaceChildren(...items.map((item) => row(item.key, action('ลบ', async () => {
    await api(route(`env/${item.key}`), 'DELETE'); await loadVars();
  }))));
}
function verification(result) {
  const element = get('verification');
  element.textContent = JSON.stringify({
    cname_target: result.cname_target,
    ownership_verification: result.ownership_verification,
    ssl_status: result.ssl?.status,
    certificate_validation_records: result.ssl?.validation_records,
  }, null, 2);
  element.hidden = false;
}
async function loadDomains() {
  const items = await api(route('domains'));
  get('domains').replaceChildren(...items.map((item) => row(`${item.domain} · ${item.status}`, action('ตรวจ DNS', async () => {
    verification(await api(route(`domains/${item.id}`), 'POST'));
    await loadDomains();
  }), action('นำออก', async () => {
    if (!window.confirm(`นำ ${item.domain} ออกหรือไม่`)) return;
    await api(route(`domains/${item.id}`), 'DELETE');
    await loadDomains();
  }))));
}
installation.addEventListener('change', () => perform(null, repoOptions));
get('refresh-repos').addEventListener('click', (event) => perform(event.currentTarget, loadRepos));
get('logout').addEventListener('click', (event) => perform(event.currentTarget, async () => { await api('logout','POST'); location.reload(); }));
revise(get('import'), async (data) => {
  const project = await api('projects', 'POST', {name:data.get('name'), repository:data.get('repository'), installation_id:Number(data.get('installation'))});
  const projects = await loadProjects();
  await openProject(projects.find((item) => item.id === project.id));
  await api(route('deployments'), 'POST');
  await history();
});
revise(get('settings'), async (data) => {
  await api(route(), 'PATCH', { ...Object.fromEntries(data), auto_deploy:data.has('auto_deploy') });
  notice.textContent = 'บันทึกแล้ว';
});
revise(get('variable'), async (data) => {
  await api(route(`env/${encodeURIComponent(data.get('key'))}`),'PUT',{value:data.get('value')});
  get('variable').reset();
  await loadVars();
});
revise(get('domain'),async (data) => { verification(await api(route('domains'),'POST',{domain:data.get('domain')})); await loadDomains(); });
get('deploy').addEventListener('click', (event) => perform(event.currentTarget, async () => { await api(route('deployments'),'POST'); await history(); }));
get('history-refresh').addEventListener('click', (event) => perform(event.currentTarget, history));
get('remove').addEventListener('click', (event) => perform(event.currentTarget, async () => {
  if (!window.confirm(`ลบโปรเจกต์ ${selected.name} หรือไม่`)) return;
  await api(route(),'DELETE');
  get('details').hidden = true;
  await loadProjects();
}));
try {
  account = await api('me');
  get('account').textContent = `${account.username} · ${account.plan}`;
  get('install').href = `https://github.com/apps/${encodeURIComponent(account.github_app)}/installations/new`;
  get('workspace').hidden = false;
  get('logout').hidden = false;
  await perform(null, () => Promise.all([loadProjects(), loadRepos()]));
} catch {
  get('login').hidden = false;
}
