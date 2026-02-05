
export const exportToJson = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};

export const importFromJson = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = event => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const json = JSON.parse(result);
          resolve(json);
        } else {
          reject(new Error("File content is not a string."));
        }
      } catch (error) {
        reject(new Error("Error parsing JSON file."));
      }
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsText(file);
  });
};

export const downloadSystemSnapshot = (db: any) => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `Rentrix_Backup_${date}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};