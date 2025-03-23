import { Document } from "@langchain/core/documents";
import fs from 'fs';
import { FAISS_BASE, SCRAPE_RESULT_HTML_BASE, SCRAPE_RESULT_TEXT_BASE } from "./constant";
import * as cheerio from 'cheerio';
const { GoogleGenerativeAI } = require("@google/generative-ai");
import path from 'path';

export async function getChatResponse(client: any, question: string, context: string) {
  try {
      const chatCompletion = await client.chat.completions.create({
          model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
          messages: [
            {
              role: "system",
              content: `
                You are an intelligent article assistant trained to read, analyze, and answer questions based only on the provided context. 
                Your responses should be:
                - **Accurate:** Stick strictly to the given context and do not speculate.  
                - **Concise:** Provide well-structured and to-the-point answers.  
                - **Formatted in Markdown:** Use proper headings, lists, and code blocks if necessary for clarity.  
                If the answer is not found in the context, respond with:  
                *"I'm sorry, but the provided context does not contain relevant information to answer your question."*
              `
            },
            { role: "user", content: question },
            {
              role: "assistant",
              content: `
                Use only the following context to answer the question. Do not include any external knowledge.  
                **Context:**  
                ${context}
                Please respond strictly in **Markdown format**.
              `
            },
          ],          
          temperature: 0.7,
          max_tokens: 512,
      });
      
      return chatCompletion.choices[0].message.content;
  } catch (error) {
      console.error("Error fetching chat response:", error);
  }
}

export async function getChatResponseGemini(question: string, context: string) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
You are an intelligent article assistant trained to read, analyze, and answer questions based only on the provided context.
Your responses should be:
- **Accurate:** Stick to the given context if it is helpful to you.
- **Concise:** Provide well-structured and to-the-point answers.
- **Formatted in Markdown:** Use proper headings, lists, and code blocks if necessary for clarity.
If the answer is not found in the context, Please still try to answer the question to the best of your ability.

Here is what the user ask: ${question}

**Context:**
${context}
Please respond strictly in **Markdown format**.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function getGeminiSummary(question: string, context: string) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
You are an intelligent assistant designed to summarize articles and provide detailed, accurate responses in Markdown format. Follow these steps:
1. **Summarize the Article**: Read the provided article and generate a concise summary that captures the key points, main ideas, and any critical details. Ensure the summary is clear and easy to understand.
2. **Format the Response**: Use Markdown formatting to structure your response. Include headings, bullet points, and bold text where appropriate to improve readability.
3. **Respond to User Queries**: After summarizing the article, be prepared to answer any follow-up questions the user may have about the article. Provide detailed and accurate answers, again using Markdown formatting.

Here is the user's question:
${question}

Here is the article:
${context}

**Summary**:
[LLM generates a summary here in Markdown format]

**Response to User Queries**:
[LLM responds to user questions here in Markdown format]
`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export function getGeminiEmbeddingModel(modelName: string) {
  const genAI = new GoogleGenerativeAI('AIzaSyCdQzAQAwL-iqK_VC5-AC7KP3x4pG5v4s8');
  const model = genAI.getGenerativeModel({ model: modelName});
  return model;
}

export function Logger(params: string) {
  console.log(`--> STEP: ${params}`);
}

export const printResultContent = (prefix: string, docs: Document[]) => {
  let content: string[] = [];
  for (const doc of docs) {
    content.push(doc.pageContent);
  }
  console.log(prefix, content);
}

export async function scrapeTextWithPuppeteer(url: string): Promise<{ cleanedText: string; html: string | null; } | null> {
  const puppeteer = require('puppeteer');

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' }); // Wait for network to be idle

    const textAndHtml = await page.evaluate(() => {
      return {
        text: document.body.innerText.trim(),
        html: document.documentElement.outerHTML
      };
    });

    await browser.close();

    // Clean up the text, remove extra whitespace and newlines.
    const cleanedText = textAndHtml.text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
    const html = cleanEmptyTags(textAndHtml.html);

    return {
      cleanedText,
      html
    };

  } catch (error) {
    console.error('Error scraping with Puppeteer:', error);
    return null;
  }
}

export function textSplitterBySentences(text: string, sentenceNumber: number, link: string, splitter = '. '): Document[] {
  const sentences = text.split(splitter);
  const documents: Document[] = [];

  for (let i = 0; i < sentences.length; i += sentenceNumber) {
    const chunk = sentences.slice(i, i + sentenceNumber).join('. ');
    documents.push(new Document({ pageContent: chunk, metadata: { link, chunkNumber: i } }));
  }

  return documents;
}

export function checkFileExist(filePath: string) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

export function removeSpecialCharacters(str: string): string {
  return str.replace(/[^a-zA-Z0-9 ]/g, '');
}

export function getEmbeddingPath(url: string) {
  return `${FAISS_BASE}/${removeSpecialCharacters(url)}`;
}

export function getScrapeResultHTMLPath(url: string) {
  return `${SCRAPE_RESULT_HTML_BASE}/${removeSpecialCharacters(url)}`;
}

export function getScrapeResultTextPath(url: string) {
  return `${SCRAPE_RESULT_TEXT_BASE}/${removeSpecialCharacters(url)}`;
}

export function cleanEmptyTags(html: string): string | null {
  const $ = cheerio.load(html);

  // Remove <style>, <script>, <header>, <footer> tags
  $('style, script, header, footer, head, title, noscript, iframe').remove();

  // Remove <html> and <body> but keep their inner content
  $('html, body').children().unwrap();

  // Convert elements to an array for efficient iteration
  const elements = $('*').toArray();

  // Reverse loop to avoid unnecessary index shifts
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    const $el = $(el);

    // Remove all attributes manually
    Object.keys($el.attr() || {}).forEach(attr => $el.removeAttr(attr));

    // Remove empty elements (no text and no children)
    if (!$el.text().trim() && $el.children().length === 0) {
      $el.remove();
    }
  }

  // Remove extra spaces, newlines, and tabs while keeping meaningful spaces
  let cleanHtml = $('body').html();
  if (cleanHtml) {
    cleanHtml = cleanHtml.replace(/\s+/g, ' ').trim();
  }


  return cleanHtml;
}

export function saveTextToFile(text: string, filename: string) {
  const dir = path.dirname(filename);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFile(filename + '.txt', text, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log(`Text saved to ${filename}.txt`);
    }
  });
}

export function readTextFromFile(filename: string): string | null {
  try {
    return fs.readFileSync(filename, 'utf8');
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
}

export function classifyQuestion(question: string) {
  if (typeof question !== "string") return "unknown";

  // Normalize: trim whitespace and convert to lowercase
  let normalized = question.trim().toLowerCase();

  // Remove common polite or introductory phrases
  // This regex targets phrases such as "please", "tell me", "can you", etc.
  for (let i = 1; i<=5; i++){
    normalized = normalized.replace(/^(please\s+)?(tell\s+me\s+)?(can\s+you\s+)?(could\s+you\s+)?(would\s+you\s+kindly\s+)?/, "");
  }

  // Now classify based on the cleaned question

  // Fact-based: starts with 'what', 'when', 'where', or 'how many'
  if (/^(what|when|where|how many)\b/.test(normalized)) {
    return "fact-based";
  }
  
  // Summary: contains 'summarize' or 'summary'
  if (normalized.includes("summarize") || normalized.includes("summary") || normalized.includes("about")) {
    return "summary";
  }
  
  // Contextual: includes phrases like 'relate' or 'they said'
  if (normalized.includes("relate") || normalized.includes("they said")) {
    return "contextual";
  }
  
  // List: starts with 'list' or includes 'available options'
  if (normalized.startsWith("list") || normalized.includes("available options")) {
    return "list";
  }
  
  // Hypothetical: starts with 'what if' or contains 'opinion' in a hypothetical context
  if (normalized.startsWith("what if") || normalized.includes("opinion")) {
    return "hypothetical";
  }
  
  // Explanatory: contains keywords like 'explain' or 'describe'
  if (normalized.includes("explain") || normalized.includes("describe")) {
    return "explanatory";
  }
  
  // Opinion-based: if the question asks for judgment or advice using words like 'should'
  if (/\bshould\b/.test(normalized)) {
    return "opinion-based";
  }

  // Fallback to unknown if no pattern matches
  return "unknown";
}
