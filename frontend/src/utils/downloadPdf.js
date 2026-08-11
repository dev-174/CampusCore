import api from '../api/axios';

/**
 * Fetches a PDF from the given API path (auth header is attached
 * automatically by the axios interceptor) and triggers a browser download.
 *
 * @param {string} path - relative API path, e.g. 'reports/my-report/pdf/'
 * @param {string} filename - suggested filename for the downloaded file
 */
export async function downloadPdf(path, filename) {
  const res = await api.get(path, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
