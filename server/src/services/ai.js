const OpenAI = require('openai');
const { OPENAI_API_KEY } = require('../config');
const db = require('../db');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

// Get Embedding
async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Check Token Limit
function checkTokenLimit(estimatedTokens) {
  const limitRow = db.prepare("SELECT value FROM settings WHERE key = 'token_limit_daily'").get();
  const usedRow = db.prepare("SELECT value FROM settings WHERE key = 'tokens_used_today'").get();
  const resetRow = db.prepare("SELECT value FROM settings WHERE key = 'last_token_reset'").get();

  const limit = parseInt(limitRow.value, 10);
  let used = parseInt(usedRow.value, 10);
  const lastReset = resetRow.value;
  const today = new Date().toISOString().split('T')[0];

  if (lastReset !== today) {
    used = 0;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'tokens_used_today'").run('0');
    db.prepare("UPDATE settings SET value = ? WHERE key = 'last_token_reset'").run(today);
  }

  if (used + estimatedTokens > limit) {
    return false;
  }
  return true;
}

function updateTokenUsage(tokens) {
  const usedRow = db.prepare("SELECT value FROM settings WHERE key = 'tokens_used_today'").get();
  const used = parseInt(usedRow.value, 10);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'tokens_used_today'").run((used + tokens).toString());
}

// RAG + Generation
async function generateResponse(userMessage, remoteJid) {
  console.log('Generating response for:', userMessage.substring(0, 50));
  if (!OPENAI_API_KEY) {
    console.error('CRITICAL: OPENAI_API_KEY is missing in environment variables!');
    return "I am currently unable to reply because my configuration is incomplete.";
  }

  // 1. Check Token Limit (Estimate input tokens roughly)
  if (!checkTokenLimit(100)) { // Minimal check
    console.warn('Token limit reached');
    return "System Error: Daily token limit reached.";
  }

  // 2. Generate Embedding for Query
  let queryEmbedding;
  try {
    queryEmbedding = await getEmbedding(userMessage);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return "Sorry, I'm having trouble processing your request right now.";
  }

  // 3. Search Knowledge Base
  const knowledgeRows = db.prepare("SELECT content, embedding FROM knowledge").all();
  const scoredKnowledge = knowledgeRows.map(row => {
    const embedding = JSON.parse(row.embedding);
    return {
      content: row.content,
      score: cosineSimilarity(queryEmbedding, embedding)
    };
  });

  // Sort by score and take top 3
  scoredKnowledge.sort((a, b) => b.score - a.score);
  const topContext = scoredKnowledge.slice(0, 3).filter(k => k.score > 0.4).map(k => k.content).join("\n\n");
  console.log('Found context items:', topContext.length > 0 ? 'Yes' : 'No');

  // 4. Fetch Chat History (Last 3 days, max 20 messages)
  let historyMessages = [];
  if (remoteJid) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const rows = db.prepare(`
      SELECT role, message 
      FROM chats 
      WHERE remote_jid = ? AND timestamp > ? 
      ORDER BY timestamp ASC 
      LIMIT 20
    `).all(remoteJid, threeDaysAgo.toISOString());

    historyMessages = rows.map(r => ({
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.message
    }));
    console.log(`Fetched ${historyMessages.length} history messages for ${remoteJid}`);
  }

  // 5. Get System Prompt & Model & Temperature
  const systemPrompt = db.prepare("SELECT value FROM settings WHERE key = 'system_prompt'").get().value;
  const model = db.prepare("SELECT value FROM settings WHERE key = 'openai_model'").get().value;
  const tempRow = db.prepare("SELECT value FROM settings WHERE key = 'temperature'").get();
  const temperature = tempRow ? parseFloat(tempRow.value) : 0.7;

  // 6. Call LLM
  try {
    const messages = [
      { role: "system", content: `${systemPrompt}\n\nRelevant Knowledge Base Context:\n${topContext}` },
      ...historyMessages,
      { role: "user", content: userMessage }
    ];

    console.log(`Sending request to OpenAI using model: ${model}, temp: ${temperature}`);
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
    });

    const reply = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;

    updateTokenUsage(tokensUsed);
    console.log('OpenAI response received, tokens used:', tokensUsed);

    return reply;
  } catch (error) {
    console.error("Error generating response:", error);
    return "I encountered an error while thinking of a response.";
  }
}

module.exports = { generateResponse, getEmbedding };
