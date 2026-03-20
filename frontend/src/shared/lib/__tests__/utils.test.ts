import { describe, expect, it } from 'vitest'
import { formatCurrency } from '../formatCurrency'
import { maskPhone } from '../maskPhone'
import { maskCep, normalizeCep } from '../maskCep'
import { isValidEmail, isStrongPassword, isValidCep } from '../validators'

describe('formatCurrency', () => {
  it('formata zero corretamente', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('formata valor inteiro', () => {
    expect(formatCurrency(100)).toBe('R$\u00a0100,00')
  })

  it('formata valor com centavos', () => {
    expect(formatCurrency(1234.5)).toBe('R$\u00a01.234,50')
  })

  it('formata valor com dois decimais', () => {
    expect(formatCurrency(199.9)).toBe('R$\u00a0199,90')
  })
})

describe('maskPhone', () => {
  it('formata celular com 11 digitos (formato XX) XXXXX-XXXX', () => {
    expect(maskPhone('45999990000')).toBe('(45) 99999-0000')
  })

  it('formata telefone fixo com 10 digitos', () => {
    expect(maskPhone('4530001234')).toBe('(45) 3000-1234')
  })

  it('remove caracteres nao numericos antes de mascarar', () => {
    expect(maskPhone('(45) 99999-0000')).toBe('(45) 99999-0000')
  })

  it('retorna apenas digitos para entrada curta', () => {
    expect(maskPhone('45')).toBe('45')
  })
})

describe('maskCep', () => {
  it('formata CEP de 8 digitos com hifen', () => {
    expect(maskCep('85807080')).toBe('85807-080')
  })

  it('nao altera CEP ja formatado', () => {
    expect(maskCep('85807-080')).toBe('85807-080')
  })

  it('retorna apenas digitos para entrada curta', () => {
    expect(maskCep('8580')).toBe('8580')
  })
})

describe('normalizeCep', () => {
  it('remove hifen do CEP formatado', () => {
    expect(normalizeCep('85807-080')).toBe('85807080')
  })

  it('retorna digitos sem alteracao se ja normalizado', () => {
    expect(normalizeCep('85807080')).toBe('85807080')
  })

  it('remove todos os caracteres nao numericos', () => {
    expect(normalizeCep('85.807-080')).toBe('85807080')
  })
})

describe('isValidEmail', () => {
  it('aceita email valido simples', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
  })

  it('aceita email valido completo', () => {
    expect(isValidEmail('usuario@rodando.com.br')).toBe(true)
  })

  it('rejeita string sem arroba', () => {
    expect(isValidEmail('invalido')).toBe(false)
  })

  it('rejeita string sem dominio', () => {
    expect(isValidEmail('teste@')).toBe(false)
  })
})

describe('isStrongPassword', () => {
  it('rejeita senha curta (menos de 6 chars)', () => {
    expect(isStrongPassword('12345')).toBe(false)
  })

  it('aceita senha com 6 ou mais caracteres', () => {
    expect(isStrongPassword('Senh@123')).toBe(true)
  })

  it('aceita exatamente 6 caracteres', () => {
    expect(isStrongPassword('abc123')).toBe(true)
  })
})

describe('isValidCep', () => {
  it('aceita CEP com hifen', () => {
    expect(isValidCep('85807-080')).toBe(true)
  })

  it('aceita CEP sem hifen (8 digitos)', () => {
    expect(isValidCep('85807080')).toBe(true)
  })

  it('rejeita CEP muito curto', () => {
    expect(isValidCep('999')).toBe(false)
  })

  it('rejeita CEP com letras', () => {
    expect(isValidCep('8580A-080')).toBe(false)
  })
})
