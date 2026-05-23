const crypto = require('crypto')

const getMasterKey = () => {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  return Buffer.from(key, 'hex')
}

const encryptFile = (fileData) => {
  const masterKey = getMasterKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)

  let encrypted = cipher.update(fileData)
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

const decryptFile = (encryptedFile) => {
  const masterKey = getMasterKey()
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    masterKey,
    Buffer.from(encryptedFile.iv, 'hex'),
  )

  decipher.setAuthTag(Buffer.from(encryptedFile.authTag, 'hex'))

  let decrypted = decipher.update(Buffer.from(encryptedFile.encryptedData, 'hex'))
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted
}

module.exports = {
  encryptFile,
  decryptFile,
}
