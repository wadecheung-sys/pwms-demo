export interface ExportColumn {
  key: string
  label: string
  formatter?: (value: unknown, row: Record<string, unknown>) => string
}

function escapeCsvCell(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`
  return val
}

export function exportToCsv(filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key]
          const text = col.formatter ? col.formatter(raw, row) : raw == null ? '' : String(raw)
          return escapeCsvCell(text)
        })
        .join(','),
    )
    .join('\n')

  const bom = '\uFEFF'
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function printTable(title: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const styles = `
    body { font-family: "Microsoft YaHei", sans-serif; padding: 24px; color: #333; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { color: #888; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  `
  const thead = `<tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>`
  const tbody = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => {
            const raw = row[col.key]
            const text = col.formatter ? col.formatter(raw, row) : raw == null ? '' : String(raw)
            return `<td>${text}</td>`
          })
          .join('')}</tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body>
    <h1>${title}</h1>
    <div class="meta">打印时间：${new Date().toLocaleString('zh-CN')} · 共 ${rows.length} 条</div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
