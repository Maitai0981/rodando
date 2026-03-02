const assert = require('node:assert/strict')
const test = require('node:test')
const request = require('supertest')
const { createTestContext } = require('./helpers/testContext')

function makeCustomerPayload(suffix) {
  return {
    name: `Cliente Assist ${suffix}`,
    email: `assist_${suffix}@rodando.local`,
    password: '123456',
    cep: '01001-000',
    addressStreet: 'Praca da Se',
    addressCity: 'Sao Paulo',
    addressState: 'SP',
  }
}

async function signUpCustomer(agent, suffix) {
  const signup = await agent.post('/api/auth/signup').send(makeCustomerPayload(suffix))
  assert.equal(signup.status, 201)
  assert.equal(signup.body?.user?.role, 'customer')
}

test('ux assist state: exige autenticacao no GET', async () => {
  const { app } = createTestContext(false)
  const response = await request(app).get('/api/ux/assist/state')
  assert.equal(response.status, 401)
})

test('ux assist state: valida payload no PUT', async () => {
  const { app } = createTestContext(false)
  const customer = request.agent(app)
  await signUpCustomer(customer, `invalid-${Date.now()}`)

  const invalidScope = await customer.put('/api/ux/assist/state').send({
    scope: 'invalid',
    routeKey: 'home',
    checklistState: { started: true },
  })
  assert.equal(invalidScope.status, 400)

  const invalidChecklist = await customer.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'home',
    checklistState: { '': true },
  })
  assert.equal(invalidChecklist.status, 400)
})

test('ux assist state: upsert com patch preserva rotas existentes', async () => {
  const { app } = createTestContext(false)
  const customer = request.agent(app)
  await signUpCustomer(customer, `patch-${Date.now()}`)

  const firstPatch = await customer.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'home',
    checklistState: { search_used: true },
    overlaySeen: true,
  })
  assert.equal(firstPatch.status, 200)
  assert.equal(firstPatch.body?.item?.overlaySeen, true)
  assert.equal(firstPatch.body?.item?.checklistState?.search_used, true)

  const secondPatch = await customer.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'home',
    checklistState: { open_catalog: true },
    dismissedTips: ['home-tip-search'],
  })
  assert.equal(secondPatch.status, 200)
  assert.equal(secondPatch.body?.item?.checklistState?.search_used, true)
  assert.equal(secondPatch.body?.item?.checklistState?.open_catalog, true)
  assert.ok(Array.isArray(secondPatch.body?.item?.dismissedTips))

  const addAnotherRoute = await customer.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'catalog',
    checklistState: { add_to_bag: true },
  })
  assert.equal(addAnotherRoute.status, 200)

  const state = await customer.get('/api/ux/assist/state?scope=public')
  assert.equal(state.status, 200)
  assert.ok(Array.isArray(state.body?.items))
  assert.equal(state.body.items.length, 2)

  const home = state.body.items.find((item) => item.routeKey === 'home')
  const catalog = state.body.items.find((item) => item.routeKey === 'catalog')
  assert.equal(home.checklistState.search_used, true)
  assert.equal(home.checklistState.open_catalog, true)
  assert.equal(catalog.checklistState.add_to_bag, true)
})

test('ux assist state: reset limpa apenas usuario autenticado', async () => {
  const { app } = createTestContext(false)
  const customerA = request.agent(app)
  const customerB = request.agent(app)
  await signUpCustomer(customerA, `a-${Date.now()}`)
  await signUpCustomer(customerB, `b-${Date.now()}`)

  const setA = await customerA.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'cart',
    checklistState: { checkout_started: true },
  })
  assert.equal(setA.status, 200)

  const setB = await customerB.put('/api/ux/assist/state').send({
    scope: 'public',
    routeKey: 'catalog',
    checklistState: { filter_applied: true },
  })
  assert.equal(setB.status, 200)

  const resetA = await customerA.post('/api/ux/assist/reset').send({})
  assert.equal(resetA.status, 200)

  const stateA = await customerA.get('/api/ux/assist/state?scope=public')
  assert.equal(stateA.status, 200)
  assert.equal(stateA.body.items.length, 0)

  const stateB = await customerB.get('/api/ux/assist/state?scope=public')
  assert.equal(stateB.status, 200)
  assert.equal(stateB.body.items.length, 1)
  assert.equal(stateB.body.items[0].routeKey, 'catalog')
})
