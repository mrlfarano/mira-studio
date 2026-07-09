import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const SERVICE_NAME = 'mira-studio'
const KEYCHAIN_DIR = path.join(os.homedir(), '.mira', 'keychain')
const KEY_FILE = path.join(os.homedir(), '.mira', '.key')

interface KeytarApi {
  getPassword: (service: string, account: string) => Promise<string | null>
  setPassword: (
    service: string,
    account: string,
    password: string,
  ) => Promise<void>
  deletePassword: (service: string, account: string) => Promise<boolean>
  findCredentials: (
    service: string,
  ) => Promise<{ account: string; password: string }[]>
}

const LOAD_FAILED = Symbol('LOAD_FAILED')
let keytarModule: KeytarApi | null | typeof LOAD_FAILED = null

async function loadKeytar(): Promise<KeytarApi | null> {
  if (keytarModule !== null) {
    return keytarModule === LOAD_FAILED ? null : keytarModule
  }
  try {
    keytarModule = (await import('keytar')) as unknown as KeytarApi
    return keytarModule
  } catch {
    keytarModule = LOAD_FAILED
    return null
  }
}

async function getEncryptionKey(): Promise<string> {
  try {
    const existing = await fs.readFile(KEY_FILE, 'utf-8')
    return existing.trim()
  } catch {
    // no key file yet
  }

  const key = crypto.randomBytes(32).toString('hex')
  await fs.mkdir(path.dirname(KEY_FILE), { recursive: true })
  await fs.writeFile(KEY_FILE, key, { mode: 0o600, encoding: 'utf-8' })
  return key
}

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'hex'),
    iv,
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string, key: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encrypted = parts.join(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'hex'),
    iv,
  )
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

class FileKeychain {
  private encryptionKey: string | null = null

  private async getKey(): Promise<string> {
    if (!this.encryptionKey) {
      this.encryptionKey = await getEncryptionKey()
    }
    return this.encryptionKey
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(KEYCHAIN_DIR, { recursive: true })
  }

  private filePath(account: string): string {
    const safe = account.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(KEYCHAIN_DIR, `${safe}.enc`)
  }

  async getPassword(_service: string, account: string): Promise<string | null> {
    try {
      const raw = await fs.readFile(this.filePath(account), 'utf-8')
      return decrypt(raw.trim(), await this.getKey())
    } catch {
      return null
    }
  }

  async setPassword(
    _service: string,
    account: string,
    password: string,
  ): Promise<void> {
    await this.ensureDir()
    const encrypted = encrypt(password, await this.getKey())
    await fs.writeFile(this.filePath(account), encrypted, {
      mode: 0o600,
      encoding: 'utf-8',
    })
  }

  async deletePassword(_service: string, account: string): Promise<boolean> {
    try {
      await fs.unlink(this.filePath(account))
      return true
    } catch {
      return false
    }
  }

  async findCredentials(
    service: string,
  ): Promise<{ account: string; password: string }[]> {
    try {
      await this.ensureDir()
      const files = await fs.readdir(KEYCHAIN_DIR)
      const results: { account: string; password: string }[] = []
      for (const file of files) {
        if (!file.endsWith('.enc')) continue
        const account = file.replace(/\.enc$/, '')
        const password = await this.getPassword(service, account)
        if (password) results.push({ account, password })
      }
      return results
    } catch {
      return []
    }
  }
}

const fileKeychain = new FileKeychain()

async function getBackend(): Promise<KeytarApi> {
  const kt = await loadKeytar()
  if (kt) {
    try {
      await kt.getPassword(SERVICE_NAME, '__mira-test__')
      return kt
    } catch {
      // keytar available but failed (e.g. no keychain daemon) — fall back
    }
  }
  return fileKeychain
}

export class KeychainStore {
  async get(account: string): Promise<string | null> {
    if (!account || account.length > 256) return null
    const backend = await getBackend()
    return backend.getPassword(SERVICE_NAME, account)
  }

  async set(account: string, secret: string): Promise<void> {
    if (!account || account.length > 256)
      throw new Error('Invalid account name')
    const backend = await getBackend()
    await backend.setPassword(SERVICE_NAME, account, secret)
  }

  async delete(account: string): Promise<boolean> {
    if (!account) return false
    const backend = await getBackend()
    return backend.deletePassword(SERVICE_NAME, account)
  }

  async listAccounts(): Promise<string[]> {
    const backend = await getBackend()
    const creds = await backend.findCredentials(SERVICE_NAME)
    return creds.map((c) => c.account)
  }
}
