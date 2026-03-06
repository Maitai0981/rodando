const assert = require('node:assert/strict')
const test = require('node:test')

const {
  requiresProductionChallenge,
  createSqlChallenge,
  verifySqlChallenge,
} = require('../src/ops/sql-runner')

test('ops sql guard: challenge obrigatório em staging/producao', () => {
  assert.equal(requiresProductionChallenge('production'), true)
  assert.equal(requiresProductionChallenge('staging'), true)
  assert.equal(requiresProductionChallenge('local'), false)
  assert.equal(requiresProductionChallenge('test'), false)
})

test('ops sql guard: validacao de challenge', () => {
  const sql = 'SELECT 1'
  const challenge = createSqlChallenge({
    sql,
    userId: 99,
    ttlMs: 60_000,
  })

  assert.ok(challenge.challengeId)
  assert.ok(challenge.phrase)

  const wrongPhrase = verifySqlChallenge({
    challengeId: challenge.challengeId,
    phrase: 'CONFIRM-000000',
    sql,
    userId: 99,
  })
  assert.equal(wrongPhrase.ok, false)
  assert.equal(wrongPhrase.reason, 'phrase_mismatch')

  const challenge2 = createSqlChallenge({
    sql,
    userId: 99,
    ttlMs: 60_000,
  })
  const ok = verifySqlChallenge({
    challengeId: challenge2.challengeId,
    phrase: challenge2.phrase,
    sql,
    userId: 99,
  })
  assert.equal(ok.ok, true)

  const missing = verifySqlChallenge({
    challengeId: 'nao-existe',
    phrase: challenge2.phrase,
    sql,
    userId: 99,
  })
  assert.equal(missing.ok, false)
  assert.equal(missing.reason, 'challenge_not_found')
})

