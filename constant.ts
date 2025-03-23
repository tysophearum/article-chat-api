import { OpenAI } from "openai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import dotenv from "dotenv";
dotenv.config();

export const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Replace with your actual API key
    baseURL: "https://api.aimlapi.com/",
});

export const huggingFaceEmbeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACEHUB_API_KEY, // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
  model: 'sentence-transformers/all-MiniLM-L6-v2'
});

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 700,
  chunkOverlap: 0,
});

export const FAISS_BASE = './faiss_embeddings';
export const SCRAPE_RESULT_HTML_BASE = './scrape_results_html';
export const SCRAPE_RESULT_TEXT_BASE = './scrape_results_text';


// google ai api key: AIzaSyCdQzAQAwL-iqK_VC5-AC7KP3x4pG5v4s8