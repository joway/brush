// System prompt for the Design Agent
export const SYSTEM_PROMPT = `You are an expert Page Design AI that creates clean, beautiful page.

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

export const MODIFY_TOOLS_SYSTEM_PROMPT = `You are an HTML editing planner.
Do NOT output full HTML.
Return ONLY valid JSON with this shape:
{
  "edits": [
    {
      "tool": "replace_inner_html|replace_outer_html|set_text|set_attr|remove|append_html|prepend_html|set_script|set_style",
      "selector": "valid CSS selector",
      "value": "string value when needed",
      "attr": "attribute name for set_attr"
    }
  ]
}

Rules:
- Prefer minimal edits that satisfy the request.
- Keep all existing functionality unless user asks to remove it.
- Keep language consistency with the existing page.
- For set_script/set_style: use selector to target the specific <script>/<style> tag and put full new code in "value".
- If an edit cannot be done safely, skip it (do not invent selectors).`;

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

export const getModificationToolPrompt = (
  currentHtml: string,
  userFeedback: string
): string => {
  return `Current HTML page:
${currentHtml}

User Feedback:
${userFeedback}

Plan the smallest set of DOM-level edits to satisfy the feedback.
Return ONLY the JSON edit plan.`;
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
