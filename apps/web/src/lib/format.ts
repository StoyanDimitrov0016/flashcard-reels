const sizeFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${sizeFormatter.format(bytes / 1024)} KB`;
  }
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
