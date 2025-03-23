import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { Logger, printResultContent, scrapeTextWithPuppeteer, getChatResponse, textSplitterBySentences, checkFileExist, getEmbeddingPath, getChatResponseGemini, saveTextToFile, getScrapeResultHTMLPath, getScrapeResultTextPath, getGeminiEmbeddingModel, readTextFromFile, classifyQuestion, getGeminiSummary } from "./utils";
import { huggingFaceEmbeddings } from './constant'
const cors = require('cors');
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(bodyParser.json());

interface Link {
  url: string
}

interface Question {
  question: string
  url: string
}

// Get all users
app.post("/ask", async (req: Request, res: Response): Promise<any> => {
  const question: Question = req.body;
  if (!question.url) {
    res.status(400).json({ message: "url is required" })
  }
  Logger('Loading a saved vector store from disk')
  const path = getEmbeddingPath(question.url);
  if (!checkFileExist(path)) {
    res.status(400).json({ message: "Please load the website first" })
  }

  let response = '';
  
  if (classifyQuestion(question.question) === 'summary') {
    const article = readTextFromFile(`${getScrapeResultTextPath(question.url)}.txt`) || '';
    response = await getGeminiSummary(question.question, article);
  }
  else {
    const loadedVectorStore = await FaissStore.load(path, huggingFaceEmbeddings);
    const loadedContextResults = await loadedVectorStore.similaritySearch(question.question, 2);
    const textResults = loadedContextResults.map(result => result.pageContent)

    response = await getChatResponseGemini(question.question, textResults.join('\n'));
  }

  return res.json({ success: true, response });
});

app.post("/embed", async (req: Request, res: Response): Promise<any> => {
  const link: Link = req.body;
  let scrapeResult: { cleanedText: string; html: string | null; } | null = null;
  if (checkFileExist(`${getScrapeResultHTMLPath(link.url)}.txt`)) {
    scrapeResult = {html: readTextFromFile(`${getScrapeResultHTMLPath(link.url)}.txt`), cleanedText: ''}
  }
  else {
    scrapeResult = await scrapeTextWithPuppeteer(link.url);
  }

  const web = getEmbeddingPath(link.url);
  if (checkFileExist(web)) {
    return res.json({ success: true, page: scrapeResult?.html })
  }
  const documents: Document[] = [
    {
      pageContent: scrapeResult?.cleanedText || '',
      metadata: { link: link.url }
    }
  ]

  if (!documents[0].pageContent) {
    res.status(500).json({ message: "Error loading the website" })
  }

  const splitedDocs = textSplitterBySentences(documents[0].pageContent, 3, link.url);
  printResultContent("Split Documents:", splitedDocs);

  Logger('Create a vector store (FAISS in this case).')
  const vectorStore = await FaissStore.fromDocuments(splitedDocs, huggingFaceEmbeddings);

  const path = getEmbeddingPath(link.url);

  Logger('Saving scrapeResult text to disk')
  saveTextToFile(scrapeResult?.cleanedText || '', getScrapeResultTextPath(link.url));

  Logger('Saving scrapeResult html to disk')
  saveTextToFile(scrapeResult?.html || '', getScrapeResultHTMLPath(link.url));

  Logger('Saving the vector store to disk')
  await vectorStore.save(path);
  Logger('Done')

  return res.json({ success: true, page: scrapeResult?.html })
});

app.post("/test", async (req: Request, res: Response): Promise<any> => {
  const model = getGeminiEmbeddingModel('models/text-embedding-004');
  const result = await model.embedContent("What is the meaning of life?");
  return res.json({ result })
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
