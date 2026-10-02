export function downloadFile(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadJson = (name, value) => downloadFile(name, new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
