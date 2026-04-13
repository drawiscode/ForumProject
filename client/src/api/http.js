function getStoredUser(){
  const raw = localStorage.getItem('af_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function apiFetch(path, { method = 'GET', body, headers } = {}) 
{
    const user =getStoredUser()
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

    const finalHeaders = {
      ...(user?.id ? { 'x-user-id': String(user.id) } : {}),
      ...(headers || {})
    }
    // 只有 JSON 才设置 Content-Type
    if (!isFormData) {
      finalHeaders['Content-Type'] = 'application/json'
    }

    const res = await fetch(path, 
    {
      method,
      headers: finalHeaders,
      body: body  ? (isFormData ? body : JSON.stringify(body))
      : undefined
    })
  
    // 兼容后端错误返回
    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }
  
    if (!res.ok) 
    {
      const message = (data && data.message) ? data.message : `HTTP ${res.status}`
      const err = new Error(message)
      err.status = res.status
      err.data = data
      throw err
    }
  
    return data
}