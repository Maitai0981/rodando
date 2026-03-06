const ACTIVE_TAB_STORAGE_KEY = 'rodando.ops.activeTab'

const state = {
  appEnv: 'local',
  requestsTimer: null,
  selectedTable: '',
  selectedTableColumns: [],
  sqlChallenge: null,
  tables: [],
}

const statusElements = {
  env: document.getElementById('ops-env'),
  health: document.getElementById('health-card'),
  ready: document.getElementById('ready-card'),
  metrics: document.getElementById('metrics-card'),
  summaryHealth: document.getElementById('summary-health'),
  summaryReady: document.getElementById('summary-ready'),
  summaryRequestsTotal: document.getElementById('summary-requests-total'),
  summaryRequestsErrors: document.getElementById('summary-requests-errors'),
  summaryCacheHit: document.getElementById('summary-cache-hit'),
  panelAlert: document.getElementById('status-alert'),
  refreshNowButton: document.getElementById('status-refresh-now'),
}

const requests = {
  form: document.getElementById('requests-filter-form'),
  resetButton: document.getElementById('requests-reset'),
  autoRefresh: document.getElementById('requests-autorefresh'),
  tbody: document.getElementById('requests-table-body'),
  meta: document.getElementById('requests-meta'),
  panelAlert: document.getElementById('requests-alert'),
  refreshNowButton: document.getElementById('requests-refresh-now'),
}

const db = {
  tableList: document.getElementById('db-table-list'),
  reloadTablesButton: document.getElementById('db-reload-tables'),
  previewForm: document.getElementById('db-preview-form'),
  previewTitle: document.getElementById('db-preview-title'),
  previewHead: document.getElementById('db-preview-head'),
  previewBody: document.getElementById('db-preview-body'),
  previewMeta: document.getElementById('db-preview-meta'),
  orderBy: document.getElementById('db-order-by'),
  panelAlert: document.getElementById('db-alert'),
  refreshNowButton: document.getElementById('db-refresh-now'),
}

const sql = {
  form: document.getElementById('sql-form'),
  input: document.getElementById('sql-input'),
  challengeButton: document.getElementById('sql-generate-challenge'),
  challengeBox: document.getElementById('sql-challenge-box'),
  challengePhrase: document.getElementById('sql-challenge-phrase'),
  challengeInput: document.getElementById('sql-challenge-input'),
  resultMeta: document.getElementById('sql-result-meta'),
  resultHead: document.getElementById('sql-result-head'),
  resultBody: document.getElementById('sql-result-body'),
  runButton: document.getElementById('sql-run-button'),
  modeBadge: document.getElementById('sql-mode-badge'),
  panelAlert: document.getElementById('sql-alert'),
}

const tabs = {
  list: document.querySelector('.ops-tabs'),
  buttons: Array.from(document.querySelectorAll('[role="tab"][data-tab]')),
  panels: Array.from(document.querySelectorAll('.tab-panel[role="tabpanel"]')),
}

const globalActions = {
  refreshAll: document.getElementById('ops-refresh-all'),
}

function toJsonText(value) {
  return JSON.stringify(value, null, 2)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function setSectionAlert(element, message) {
  if (!element) return
  const text = String(message || '').trim()
  if (!text) {
    element.hidden = true
    element.textContent = ''
    return
  }
  element.hidden = false
  element.textContent = text
}

function setButtonBusy(button, busy, idleLabel, busyLabel = 'Carregando...') {
  if (!button) return
  if (busy) {
    button.disabled = true
    button.dataset.idleLabel = idleLabel || button.textContent || ''
    button.textContent = busyLabel
    return
  }
  button.disabled = false
  if (button.dataset.idleLabel) {
    button.textContent = button.dataset.idleLabel
  }
}

function dateTimeLocalToIso(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function formatDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('pt-BR')
}

function getFormDataAsQuery(form) {
  const formData = new FormData(form)
  const params = new URLSearchParams()
  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue || '').trim()
    if (!value) continue
    if (key === 'from' || key === 'to') {
      const iso = dateTimeLocalToIso(value)
      if (iso) params.set(key, iso)
      continue
    }
    params.set(key, value)
  }
  return params
}

function methodClass(method) {
  const value = String(method || '').toLowerCase()
  if (!value) return ''
  return `method-${value}`
}

function statusClass(status) {
  const parsed = Number(status)
  if (!Number.isFinite(parsed) || parsed < 100) return 'status-4'
  const group = Math.floor(parsed / 100)
  return `status-${group}`
}

function latencyClass(durationMs) {
  const value = Number(durationMs || 0)
  if (value <= 250) return 'latency-fast'
  if (value <= 1000) return 'latency-medium'
  return 'latency-slow'
}

function setToneClass(element, tone) {
  if (!element) return
  element.classList.remove('status-ok', 'status-warn', 'status-error')
  if (tone === 'ok') element.classList.add('status-ok')
  if (tone === 'warn') element.classList.add('status-warn')
  if (tone === 'error') element.classList.add('status-error')
}

async function apiRequest(path, options = {}) {
  const mergedHeaders = {
    ...(options.headers || {}),
  }
  if (options.body && !mergedHeaders['content-type']) {
    mergedHeaders['content-type'] = 'application/json'
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: mergedHeaders,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Erro HTTP ${response.status}`
    throw new Error(message)
  }
  return payload
}

function setActiveTab(nextTabId, { persist = true, focusButton = false } = {}) {
  const normalized = String(nextTabId || '')
  const selectedButton = tabs.buttons.find((button) => button.dataset.tab === normalized) || tabs.buttons[0]
  if (!selectedButton) return
  const targetPanelId = selectedButton.getAttribute('aria-controls')

  tabs.buttons.forEach((button) => {
    const active = button === selectedButton
    button.setAttribute('aria-selected', active ? 'true' : 'false')
    button.tabIndex = active ? 0 : -1
  })

  tabs.panels.forEach((panel) => {
    const active = panel.id === targetPanelId
    panel.classList.toggle('active', active)
    panel.hidden = !active
  })

  if (focusButton) {
    selectedButton.focus()
  }
  if (persist) {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, selectedButton.dataset.tab || 'status')
  }
}

function renderStatusCard(element, data) {
  if (!element) return
  element.textContent = toJsonText(data)
}

function sumServerErrors(byStatus) {
  if (!byStatus || typeof byStatus !== 'object') return 0
  return Object.entries(byStatus).reduce((total, [status, count]) => {
    const parsedStatus = Number(status)
    if (!Number.isFinite(parsedStatus) || parsedStatus < 500) return total
    return total + Number(count || 0)
  }, 0)
}

async function loadStatus() {
  setSectionAlert(statusElements.panelAlert, '')
  setButtonBusy(statusElements.refreshNowButton, true, 'Atualizar agora')
  try {
    const [health, ready, metrics] = await Promise.all([
      apiRequest('/api/health'),
      apiRequest('/api/ready'),
      apiRequest('/api/metrics'),
    ])

    renderStatusCard(statusElements.health, health)
    renderStatusCard(statusElements.ready, ready)
    renderStatusCard(statusElements.metrics, {
      requests: {
        total: metrics?.requests?.total,
        slowest: Array.isArray(metrics?.requests?.routes) ? metrics.requests.routes.slice(0, 5) : [],
      },
      cache: metrics?.cache,
      queries: metrics?.queries,
      outbox: metrics?.outbox,
    })

    const readyOk = String(ready?.status || '').toLowerCase() === 'ready'
    const healthOk = String(health?.status || '').toLowerCase() === 'ok'
    const cacheHitRate = Number(metrics?.cache?.hitRate || 0)
    const requestsTotal = Number(metrics?.requests?.total || 0)
    const requestsErrors = sumServerErrors(metrics?.requests?.byStatus)
    state.appEnv = String(ready?.checks?.environment?.appEnv || 'local')

    statusElements.env.textContent = `ambiente: ${state.appEnv}`
    statusElements.summaryHealth.textContent = healthOk ? 'ONLINE' : 'ERRO'
    statusElements.summaryReady.textContent = readyOk ? 'READY' : 'NOT READY'
    statusElements.summaryRequestsTotal.textContent = requestsTotal.toLocaleString('pt-BR')
    statusElements.summaryRequestsErrors.textContent = requestsErrors.toLocaleString('pt-BR')
    statusElements.summaryCacheHit.textContent = `${(cacheHitRate * 100).toFixed(1)}%`
    setToneClass(statusElements.summaryHealth, healthOk ? 'ok' : 'error')
    setToneClass(statusElements.summaryReady, readyOk ? 'ok' : 'warn')
    setToneClass(statusElements.summaryRequestsErrors, requestsErrors > 0 ? 'error' : 'ok')
    setToneClass(statusElements.summaryCacheHit, cacheHitRate >= 0.7 ? 'ok' : cacheHitRate >= 0.4 ? 'warn' : 'error')

    if (sql.modeBadge) {
      const isStrictMode = state.appEnv === 'staging' || state.appEnv === 'production'
      sql.modeBadge.textContent = isStrictMode ? 'confirmacao dupla ativa' : 'modo local'
      sql.modeBadge.classList.toggle('chip-warning', isStrictMode)
    }
  } catch (error) {
    const message = String(error?.message || error)
    renderStatusCard(statusElements.health, { error: message })
    setSectionAlert(statusElements.panelAlert, message)
  } finally {
    setButtonBusy(statusElements.refreshNowButton, false, 'Atualizar agora')
  }
}

function renderRequestRows(items) {
  if (!items.length) {
    requests.tbody.innerHTML = '<tr><td colspan="8">Nenhuma requisicao encontrada.</td></tr>'
    return
  }

  requests.tbody.innerHTML = items
    .map((item) => {
      const method = String(item.method || '-')
      const status = Number(item.status || 0)
      const duration = Number(item.durationMs || 0)
      return `
        <tr>
          <td>${escapeHtml(formatDateTime(item.ts))}</td>
          <td><span class="badge badge-method ${methodClass(method)}">${escapeHtml(method)}</span></td>
          <td>${escapeHtml(item.path)}<br><span class="muted">${escapeHtml(item.routeKey)}</span></td>
          <td><span class="badge badge-status ${statusClass(status)}">${escapeHtml(status || '-')}</span></td>
          <td><span class="badge badge-latency ${latencyClass(duration)}">${escapeHtml(duration)}ms</span></td>
          <td>${escapeHtml(item.userId ?? '-')}</td>
          <td><span class="muted">${escapeHtml(item.requestId)}</span></td>
          <td>
            <details class="payload-details">
              <summary>query/body</summary>
              <pre>${escapeHtml(toJsonText({ query: item.queryMasked, body: item.bodyMasked }))}</pre>
            </details>
          </td>
        </tr>
      `
    })
    .join('')
}

async function loadRequests() {
  setSectionAlert(requests.panelAlert, '')
  setButtonBusy(requests.refreshNowButton, true, 'Atualizar agora')
  try {
    const params = getFormDataAsQuery(requests.form)
    const query = params.toString()
    const data = await apiRequest(`/api/owner/ops/requests${query ? `?${query}` : ''}`)
    renderRequestRows(data.items || [])
    requests.meta.textContent = `Exibindo ${data.items?.length || 0} de ${data.meta?.total || 0} (buffer: ${data.meta?.bufferSize || 0})`
  } catch (error) {
    const message = String(error?.message || error)
    requests.tbody.innerHTML = `<tr><td colspan="8">${escapeHtml(message)}</td></tr>`
    requests.meta.textContent = ''
    setSectionAlert(requests.panelAlert, message)
  } finally {
    setButtonBusy(requests.refreshNowButton, false, 'Atualizar agora')
  }
}

function setRequestsAutoRefresh(seconds) {
  if (state.requestsTimer) {
    window.clearInterval(state.requestsTimer)
    state.requestsTimer = null
  }
  const parsed = Number(seconds)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  state.requestsTimer = window.setInterval(() => {
    void loadRequests()
  }, parsed * 1000)
}

function renderTables(items) {
  if (!items.length) {
    db.tableList.innerHTML = '<li>Nenhuma tabela encontrada.</li>'
    return
  }
  db.tableList.innerHTML = items
    .map((item) => {
      const active = state.selectedTable === item.name
      return `
        <li>
          <button type="button" class="table-item button button-secondary ${active ? 'active' : ''}" data-table-name="${escapeHtml(item.name)}">
            <strong>${escapeHtml(item.name)}</strong><br>
            <span class="muted">rows~${escapeHtml(item.rowEstimate)} | ${escapeHtml(item.sizePretty)}</span>
          </button>
        </li>
      `
    })
    .join('')
}

async function loadTables() {
  setSectionAlert(db.panelAlert, '')
  setButtonBusy(db.reloadTablesButton, true, 'Atualizar')
  try {
    const data = await apiRequest('/api/owner/ops/db/tables')
    state.tables = Array.isArray(data.items) ? data.items : []
    renderTables(state.tables)
    if (!state.selectedTable && state.tables.length) {
      state.selectedTable = state.tables[0].name
    }
    if (state.selectedTable) {
      await loadTablePreview()
    }
  } catch (error) {
    const message = String(error?.message || error)
    db.tableList.innerHTML = `<li>${escapeHtml(message)}</li>`
    setSectionAlert(db.panelAlert, message)
  } finally {
    setButtonBusy(db.reloadTablesButton, false, 'Atualizar')
  }
}

function formatCellValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function renderTable(headElement, bodyElement, columns, rows) {
  headElement.innerHTML = `<tr>${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('')}</tr>`
  if (!rows.length) {
    bodyElement.innerHTML = `<tr><td colspan="${Math.max(columns.length, 1)}">Sem linhas.</td></tr>`
    return
  }
  bodyElement.innerHTML = rows
    .map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(formatCellValue(row[col]))}</td>`).join('')}</tr>`)
    .join('')
}

function syncOrderBySelect(columns) {
  const current = String(db.orderBy.value || '')
  db.orderBy.innerHTML = [
    '<option value="">ordenacao padrao</option>',
    ...columns.map((col) => `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`),
  ].join('')
  if (current && columns.includes(current)) {
    db.orderBy.value = current
  }
}

async function loadTablePreview() {
  if (!state.selectedTable) return
  setSectionAlert(db.panelAlert, '')
  try {
    db.previewTitle.textContent = `Preview: ${state.selectedTable}`
    const params = getFormDataAsQuery(db.previewForm)
    const query = params.toString()
    const data = await apiRequest(`/api/owner/ops/db/table/${encodeURIComponent(state.selectedTable)}${query ? `?${query}` : ''}`)
    state.selectedTableColumns = Array.isArray(data.columns) ? data.columns.map((item) => item.name) : []
    syncOrderBySelect(state.selectedTableColumns)
    renderTable(db.previewHead, db.previewBody, state.selectedTableColumns, data.rows || [])
    db.previewMeta.textContent = `Tabela ${data.table} | linhas exibidas: ${data.rows?.length || 0} | rows~${data.meta?.rowEstimate || 0} | nextOffset=${data.meta?.nextOffset ?? '-'}`
  } catch (error) {
    const message = String(error?.message || error)
    db.previewHead.innerHTML = ''
    db.previewBody.innerHTML = `<tr><td>${escapeHtml(message)}</td></tr>`
    db.previewMeta.textContent = ''
    setSectionAlert(db.panelAlert, message)
  }
}

function clearSqlChallenge() {
  state.sqlChallenge = null
  sql.challengePhrase.textContent = ''
  sql.challengeInput.value = ''
  sql.challengeBox.hidden = true
}

async function generateSqlChallenge() {
  const sqlText = String(sql.input.value || '').trim()
  if (!sqlText) {
    setSectionAlert(sql.panelAlert, 'Informe um SQL antes de gerar desafio.')
    return
  }

  setSectionAlert(sql.panelAlert, '')
  setButtonBusy(sql.challengeButton, true, 'Gerar desafio')
  try {
    const payload = await apiRequest('/api/owner/ops/db/sql/challenge', {
      method: 'POST',
      body: JSON.stringify({ sql: sqlText }),
    })
    state.sqlChallenge = payload
    sql.challengePhrase.textContent = payload.phrase
    sql.challengeInput.value = ''
    sql.challengeBox.hidden = false
  } catch (error) {
    setSectionAlert(sql.panelAlert, String(error?.message || error))
  } finally {
    setButtonBusy(sql.challengeButton, false, 'Gerar desafio')
  }
}

function renderSqlResult(data) {
  sql.resultMeta.textContent = toJsonText({
    command: data.command,
    rowCount: data.rowCount,
    executionMs: data.executionMs,
    truncated: data.truncated,
    notices: data.notices,
  })
  renderTable(sql.resultHead, sql.resultBody, data.columns || [], data.rows || [])
}

async function runSql(event) {
  event.preventDefault()
  const sqlText = String(sql.input.value || '').trim()
  if (!sqlText) {
    setSectionAlert(sql.panelAlert, 'Informe um SQL para executar.')
    return
  }

  const payload = { sql: sqlText }
  if (state.sqlChallenge) {
    payload.challengeId = state.sqlChallenge.challengeId
    payload.phrase = String(sql.challengeInput.value || '').trim()
  }

  setSectionAlert(sql.panelAlert, '')
  setButtonBusy(sql.runButton, true, 'Executar SQL', 'Executando...')
  try {
    const data = await apiRequest('/api/owner/ops/db/sql', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    renderSqlResult(data)
    clearSqlChallenge()
  } catch (error) {
    sql.resultMeta.textContent = `Erro: ${String(error?.message || error)}`
    setSectionAlert(sql.panelAlert, String(error?.message || error))
  } finally {
    setButtonBusy(sql.runButton, false, 'Executar SQL')
  }
}

function bindTabEvents() {
  tabs.buttons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tab, { persist: true, focusButton: false })
    })
  })

  tabs.list.addEventListener('keydown', (event) => {
    const key = event.key
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return

    const activeIndex = tabs.buttons.findIndex((button) => button.getAttribute('aria-selected') === 'true')
    if (activeIndex < 0) return

    event.preventDefault()
    let nextIndex = activeIndex
    if (key === 'ArrowRight') nextIndex = (activeIndex + 1) % tabs.buttons.length
    if (key === 'ArrowLeft') nextIndex = (activeIndex - 1 + tabs.buttons.length) % tabs.buttons.length
    if (key === 'Home') nextIndex = 0
    if (key === 'End') nextIndex = tabs.buttons.length - 1

    const nextButton = tabs.buttons[nextIndex]
    setActiveTab(nextButton.dataset.tab, { persist: true, focusButton: true })
  })
}

function bindEvents() {
  bindTabEvents()

  requests.form.addEventListener('submit', (event) => {
    event.preventDefault()
    void loadRequests()
  })
  requests.resetButton.addEventListener('click', () => {
    requests.form.reset()
    void loadRequests()
  })
  requests.autoRefresh.addEventListener('change', (event) => {
    setRequestsAutoRefresh(Number(event.target.value))
  })
  requests.refreshNowButton.addEventListener('click', () => {
    void loadRequests()
  })

  db.reloadTablesButton.addEventListener('click', () => {
    void loadTables()
  })
  db.refreshNowButton.addEventListener('click', async () => {
    await loadTables()
    await loadTablePreview()
  })
  db.tableList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-table-name]')
    if (!target) return
    state.selectedTable = String(target.getAttribute('data-table-name') || '')
    renderTables(state.tables)
    void loadTablePreview()
  })
  db.previewForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void loadTablePreview()
  })

  sql.challengeButton.addEventListener('click', () => {
    void generateSqlChallenge()
  })
  sql.form.addEventListener('submit', runSql)

  statusElements.refreshNowButton.addEventListener('click', () => {
    void loadStatus()
  })

  globalActions.refreshAll.addEventListener('click', async () => {
    setButtonBusy(globalActions.refreshAll, true, 'Atualizar tudo')
    try {
      await Promise.all([loadStatus(), loadRequests(), loadTables()])
    } finally {
      setButtonBusy(globalActions.refreshAll, false, 'Atualizar tudo')
    }
  })
}

async function bootstrap() {
  bindEvents()
  const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || 'status'
  setActiveTab(savedTab, { persist: false })
  await loadStatus()
  await loadRequests()
  await loadTables()
  setRequestsAutoRefresh(Number(requests.autoRefresh.value))
}

void bootstrap()
