export function renderMarkdown(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const lines = escaped.split(/\r?\n/)
  let html = ''
  let inList = false
  const closeList = () => {
    if (inList) {
      html += '</ul>'
      inList = false
    }
  }
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList()
      html += `<b>${trimmed.replace(/^#{1,3}\s+/, '')}</b><br/>`
    } else if (/^[*•-]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${trimmed.replace(/^[*•-]\s+/, '')}</li>`
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${trimmed.replace(/^\d+[.)]\s+/, '')}</li>`
    } else {
      closeList()
      if (trimmed) html += `${trimmed}<br/>`
    }
  })
  closeList()
  const bold = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  return bold.replace(/`([^`]+)`/g, '<code>$1</code>')
}
