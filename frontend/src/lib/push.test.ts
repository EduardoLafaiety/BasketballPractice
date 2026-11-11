import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, Resposta } from '../test/api-falsa'
import { ativarPush, chaveParaBytes, desativarPush } from './push'

const inscricao = {
  endpoint: 'https://push.exemplo.com/abc',
  toJSON: () => ({ endpoint: 'https://push.exemplo.com/abc', keys: { p256dh: 'p256', auth: 'aut' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
}

function navegador({ jaInscrito = false, permissao = 'granted' as NotificationPermission } = {}) {
  const subscribe = vi.fn().mockResolvedValue(inscricao)
  const pushManager = { getSubscription: vi.fn().mockResolvedValue(jaInscrito ? inscricao : null), subscribe }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue({ pushManager }) } })
  vi.stubGlobal('PushManager', function PushManager() {})
  vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue(permissao), permission: permissao })
  return { subscribe }
}

beforeEach(() => definirToken('tk'))
afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('Web Push no navegador', () => {
  it('converte a chave VAPID de base64url', () => {
    expect([...chaveParaBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239])
  })

  it('inscreve o navegador com a chave do servidor e manda a inscrição com o fuso', async () => {
    const { subscribe } = navegador()
    const { ultima } = apiFalsa({
      'GET /push/config': { enabled: true, publicKey: 'AQID' },
      'POST /push/subscriptions': new Resposta(201, { subscribed: true }),
    })
    await ativarPush()
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([1, 2, 3]) })
    expect(ultima('POST', '/push/subscriptions')?.corpo).toEqual({
      endpoint: 'https://push.exemplo.com/abc',
      keys: { p256dh: 'p256', auth: 'aut' },
      tzOffset: new Date().getTimezoneOffset(),
    })
  })

  it('explica quando o servidor não tem as chaves ou a permissão é negada', async () => {
    navegador({ permissao: 'denied' })
    apiFalsa({ 'GET /push/config': { enabled: false, publicKey: null } })
    await expect(ativarPush()).rejects.toThrow('ainda não foram ligadas neste servidor')
    apiFalsa({ 'GET /push/config': { enabled: true, publicKey: 'AQID' } })
    await expect(ativarPush()).rejects.toThrow('bloqueadas')
  })

  it('desativar avisa o servidor e cancela a inscrição', async () => {
    navegador({ jaInscrito: true })
    const { ultima } = apiFalsa({ 'DELETE /push/subscriptions': new Resposta(204) })
    await desativarPush()
    expect(ultima('DELETE', '/push/subscriptions')?.corpo).toEqual({ endpoint: 'https://push.exemplo.com/abc' })
    expect(inscricao.unsubscribe).toHaveBeenCalled()
  })
})
