import './style.css'

const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-command]')
const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]')
const localCommands = [
  'git clone https://github.com/chenzhiyong1994/model-space.git',
  'cd model-space',
  'npm ci',
  'npm run dev',
].join('\n')

copyButton?.addEventListener('click', async () => {
  if (!copyStatus) return
  try {
    await navigator.clipboard.writeText(localCommands)
    copyStatus.textContent = '命令已复制，可以粘贴到终端运行。'
  } catch {
    copyStatus.textContent = '浏览器未允许复制，请选中上方命令手动复制。'
  }
})
