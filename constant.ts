import { OpenAI } from "openai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export const openAIClient = new OpenAI({
    apiKey: "30a70daad7954b12b3ca3fa1a2358fe1", // Replace with your actual API key
    baseURL: "https://api.aimlapi.com/",
});

export const huggingFaceEmbeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: "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", // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
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