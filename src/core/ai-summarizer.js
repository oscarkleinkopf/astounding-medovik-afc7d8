/**
 * @module ai-summarizer
 * @description Uses Google Gemini API to generate 2-3 concise summary bullet points
 * for saved bookmarks.
 */

/**
 * Generates an AI summary for a bookmark.
 * 
 * @param {Object} bookmark - Bookmark object (title, url, tags, description)
 * @param {string} apiKey - Gemini API Key
 * @param {string} [language='en'] - 'en' or 'es'
 * @returns {Promise<string>} 2-3 bullet point summary text
 */
export async function summarizeBookmark(bookmark, apiKey, language = 'en') {
  if (!bookmark || !bookmark.url) {
    throw new Error('Bookmark URL is required for AI summarization.');
  }
  if (!apiKey) {
    throw new Error('Gemini API key is required for AI summarization.');
  }

  const title = bookmark.title || 'Untitled';
  const url = bookmark.url;
  const tags = (bookmark.tags || []).join(', ');
  const existingNotes = bookmark.description || '';

  const langPrompt = language === 'es'
    ? 'Responde en ESPAÑOL. Proporciona exactamente 2 a 3 viñetas concisas (usando •) que expliquen de qué trata este enlace o qué beneficio ofrece al usuario.'
    : 'Respond in ENGLISH. Provide exactly 2 to 3 concise bullet points (using •) explaining what this link is about or what key value it provides.';

  const prompt = `You are an expert content summarizer for a bookmark management app.
Analyze the following bookmark metadata and provide a brief, high-value summary of what this website/tool/resource is about.

Bookmark Title: "${title}"
URL: "${url}"
Tags: "${tags}"
${existingNotes ? `Existing User Notes: "${existingNotes}"` : ''}

${langPrompt}
Do NOT add introductory text or conversational filler. Return ONLY the bullet points.`;

  const model = 'gemini-2.0-flash';
  const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text.trim()) {
      throw new Error('Empty summary returned by AI model.');
    }

    return text.trim();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[ai-summarizer] Failed to generate summary:', error);
    throw error;
  }
}
