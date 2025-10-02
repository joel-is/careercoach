import pdf from 'pdf-parse';
import fs from 'fs/promises';

export async function parseResume(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse resume');
  }
}
