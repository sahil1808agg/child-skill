import Tesseract from 'tesseract.js'
import pdfParse from 'pdf-parse'
import fs from 'fs/promises'

export class OCRService {
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      throw new Error('Failed to extract text from PDF')
    }
  }

  async extractTextFromImage(filePath: string): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(
        filePath,
        'eng',
        {
          logger: (m) => console.log(m)
        }
      )
      return text
    } catch (error) {
      console.error('Error extracting text from image:', error)
      throw new Error('Failed to extract text from image')
    }
  }

  async extractText(filePath: string, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.extractTextFromPDF(filePath)
    } else if (mimeType.startsWith('image/')) {
      return this.extractTextFromImage(filePath)
    } else {
      throw new Error('Unsupported file type')
    }
  }
}

export default new OCRService()
