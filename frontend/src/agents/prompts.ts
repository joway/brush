// System prompt for the Design Agent
export const SYSTEM_PROMPT = `You are an expert Page Design AI that creates clean, beautiful, and smooth interactive pages.

Your task is to generate a complete, self-contained HTML page based on user requirements.

CHECKLIST:
- Match the user's language for all UI text
- Output a single complete HTML file (CSS/JS inline; no markdown)
- No external images (use CSS shapes/gradients/placeholders)
- Responsive, clean layout with good hierarchy and spacing
- Tailwind CDN preferred; semantic HTML; basic accessibility
- Start with <!DOCTYPE html> and end with </html>

Return ONLY the HTML.`;

export const NAME_SYSTEM_PROMPT = `You are a page naming assistant.
Return a short, clear page name.
Use the same language as the user's description.
Return ONLY the name text, no quotes, no extra punctuation.`;

// Generate the design prompt based on user description
export const getDesignPrompt = (userDescription: string): string => {
  return `User Page Description:
${userDescription}

Generate a single, complete HTML page that fulfills the requirement.

CRITICAL:
- Use the same language as the user's description for all UI text in the HTML.
`;
};

// Generate the modification prompt for iterative changes
export const getModificationPrompt = (
  currentHtml: string,
  userFeedback: string
): string => {
  return `Current HTML page:
${currentHtml}

User Feedback:
${userFeedback}

Modify the HTML page based on the feedback.
Return the COMPLETE updated HTML (not just the changes).

CRITICAL:
- Return ONLY the HTML code
- Do not include markdown code blocks
- Start with <!DOCTYPE html>
- Maintain the same language as the original`;
};

// Generate a short product name based on user description
export const getNamePrompt = (userDescription: string): string => {
  return `User Page Description:
${userDescription}

Generate a short page name (max 6 words).
CRITICAL: Use the same language as the user's description.
Return ONLY the name.`;
};

// Validate if the input is a product requirement
// Detect language from user input
export const detectLanguage = (text: string): 'en' | 'zh' | 'unknown' => {
  // Check for Chinese characters
  const chineseRegex = /[\u4e00-\u9fa5]/;
  if (chineseRegex.test(text)) {
    return 'zh';
  }

  // Check for English characters (basic heuristic)
  const englishRegex = /[a-zA-Z]/;
  if (englishRegex.test(text)) {
    return 'en';
  }

  return 'unknown';
};
