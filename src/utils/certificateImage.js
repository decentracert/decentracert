export async function drawCertificate(event, framed = true) {
  if (!event.name.trim()) throw new Error('Enter an event name before making a template.');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1f0e7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#284b3d';
  if (framed) {
    ctx.strokeStyle = '#284b3d';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 1308, 908);
    ctx.strokeRect(58, 58, 1284, 884);
  } else {
    ctx.fillRect(0, 0, 36, canvas.height);
  }
  ctx.font = '24px "IBM Plex Mono", monospace';
  ctx.fillText('CERTIFICATE OF PARTICIPATION', 120, 170);
  ctx.fillRect(120, 213, 88, 3);
  ctx.font = '500 64px "IBM Plex Sans", sans-serif';
  ctx.fillText(event.name.trim().slice(0, 120), 120, 335, 1160);
  ctx.fillStyle = '#46524b';
  ctx.font = '28px "IBM Plex Sans", sans-serif';
  const words = event.description.trim().slice(0, 250).split(/\s+/);
  let line = '', row = 0;
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > 1100 && line) {
      ctx.fillText(line, 120, 420 + row * 42, 1160);
      line = word;
      row += 1;
    } else line = next;
  }
  if (line) ctx.fillText(line, 120, 420 + row * 42, 1160);
  ctx.fillStyle = '#284b3d';
  ctx.font = '28px "IBM Plex Sans", sans-serif';
  ctx.fillText(event.organizer || 'Event organizer', 120, 750, 1000);
  ctx.font = '22px "IBM Plex Mono", monospace';
  ctx.fillText(event.date || '', 120, 795);
  ctx.fillStyle = '#647068';
  ctx.font = '18px "IBM Plex Sans", sans-serif';
  ctx.fillText('Recipient ownership is recorded in the event contract.', 120, 885);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(new File([blob], 'certificate.png', { type: 'image/png' }));
    else reject(new Error('The certificate image could not be created.'));
  }, 'image/png'));
}
