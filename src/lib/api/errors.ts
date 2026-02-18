type ApiErrorPayload = {
  error?: unknown
  errors?: Record<string, unknown>
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) return trimmed
    return null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractErrorMessage(item)
      if (message) return message
    }
    return null
  }
  if (typeof value === 'object' && value !== null) {
    const maybeMessage = (value as { message?: unknown }).message
    if (typeof maybeMessage === 'string') {
      const trimmed = maybeMessage.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

export function getFirstApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as ApiErrorPayload

  if (typeof data.error === 'string') {
    const trimmed = data.error.trim()
    if (trimmed) return trimmed
  }

  if (data.errors && typeof data.errors === 'object') {
    for (const [field, value] of Object.entries(data.errors)) {
      const message = extractErrorMessage(value)
      if (message) return `${field}: ${message}`
    }
  }

  return null
}
