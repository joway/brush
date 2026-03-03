# AI Agents Design

This document describes the AI agents used in Magic Brush and their prompt engineering for page creation.

## Overview

Magic Brush uses AI agents to transform user descriptions into interactive HTML pages. The agents are designed to:

1. Understand page requirements in natural language
2. Generate complete, self-contained HTML pages
3. Support iterative modifications through conversation
4. Maintain language consistency with user input

---

## Agent Architecture

### Design Agent

**Location**: `frontend/src/agents/DesignAgent.ts`

**Purpose**: Core agent responsible for generating and modifying pages

**Capabilities**:
- Generate initial HTML pages from user descriptions
- Modify existing pages based on user feedback
- Support both OpenAI (GPT-4) and Claude (Sonnet 3.5)
- Streaming responses for real-time progress feedback
- Conversation history management

---

## System Prompt

**File**: `frontend/src/agents/prompts.ts`

### Core Directive

```
You are an expert Page Design AI that creates clean, beautiful, and smooth interactive pages.

Your task is to generate a complete, self-contained HTML page based on user requirements.
```

### Critical Rules

#### 1. Language Detection and Consistency

**Rule**:
```
Detect the user's input language and use the SAME language in ALL text content in the HTML output.
```

**Implementation**:
- Automatic language detection (English, Chinese, etc.)
- All UI text matches user's language
- Maintains consistency across iterations

#### 2. Output Format

**Requirements**:
```
Generate a COMPLETE, SINGLE HTML file with:
- Embedded CSS in <style> tags
- Embedded JavaScript in <script> tags
- No external dependencies (use CDN links if needed)
- Fully functional and interactive
```

**Technical Specs**:
- Start with `<!DOCTYPE html>`
- No markdown code blocks
- Self-contained (no external files)
- Works offline

#### 3. Data & Interactivity Requirements

**Rule**:
```
Use realistic mock data and show it by default. Make key flows interactive on that data.
Do NOT use external images; use simple CSS shapes/gradients/placeholders instead.
```

**Implementation**:
- Provide mock items for lists/cards/tables (e.g., posts, products, tasks)
- Make interactions functional (e.g., list → detail view)
- Avoid external images; illustrate visuals with CSS

#### 4. Design Quality Standards

**Visual Design**:
- Clean, elegant, and visually pleasing UI
- Responsive design (mobile-friendly)
- Strong information hierarchy, spacing, and typography
- Smooth, purposeful interactions and transitions
- Accessible (semantic HTML, ARIA labels)

**Technical Standards**:
- HTML5 features
- Tailwind CSS via CDN (preferred)
- Organized, modular code
- English comments for clarity

---

## Prompt Templates

### 1. Initial Design Prompt

**Function**: `getDesignPrompt(userDescription: string)`

**Template**:
```typescript
User Product Description:
${userDescription}

Please analyze this product requirement and generate a complete HTML page.

Think through:
1. What is the core functionality of this product?
2. Who are the target users?
3. What are the main user flows and interactions?
4. What UI components are needed?
5. What's the information hierarchy?

Then generate a single, complete HTML file that demonstrates this page.

CRITICAL:
- Use the same language as the user's description for all UI text in the HTML.
- Use realistic mock data and make it visible by default.
- Ensure key interactions work on the mock data (e.g., list to detail view).
- Do NOT use external images; use CSS shapes/gradients/placeholders instead.
```

**Purpose**:
- Guides initial page generation
- Encourages thoughtful analysis
- Ensures language consistency

### 2. Modification Prompt

**Function**: `getModificationPrompt(currentHtml: string, userFeedback: string)`

**Template**:
```typescript
Current HTML page:
${currentHtml}

User Feedback:
${userFeedback}

Please modify the HTML page based on the user's feedback.

1. Understand what changes the user wants
2. Update the HTML accordingly
3. Maintain the same language as before
4. Ensure all interactive features still work
5. Keep the design cohesive

Return the COMPLETE updated HTML (not just the changes).

CRITICAL:
- Return ONLY the HTML code
- Do not include markdown code blocks
- Start with <!DOCTYPE html>
- Maintain the same language as the original
```

**Purpose**:
- Iterative refinement
- Maintains design consistency
- Preserves language and functionality

---

## Agent Workflow

### Initial Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Input                                               │
│    - Page description                                       │
│    - Natural language (any language)                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Agent Processing                                         │
│    - Send to LLM with system prompt                         │
│    - Stream response                                        │
│    - Parse HTML output                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Output Processing                                        │
│    - Extract HTML from response                             │
│    - Remove markdown blocks if present                      │
│    - Save to storage                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Render                                                   │
│    - Display in iframe                                      │
│    - Save conversation history                              │
└─────────────────────────────────────────────────────────────┘
```

### Modification Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Feedback                                            │
│    - Describe desired changes                               │
│    - Can be in any language                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Context Preparation                                      │
│    - Load current HTML                                      │
│    - Prepare modification prompt                            │
│    - Include conversation history                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent Processing                                         │
│    - Send modification request                              │
│    - Stream updated HTML                                    │
│    - Maintain design consistency                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Update & Persist                                         │
│    - Extract updated HTML                                   │
│    - Save to storage                                        │
│    - Update conversation history                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Refresh Display                                          │
│    - Reload iframe                                          │
│    - Show updated page                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Language Support

### Detection Algorithm

**File**: `frontend/src/agents/prompts.ts`

**Function**: `detectLanguage(text: string)`

```typescript
// Check for Chinese characters
const chineseRegex = /[\u4e00-\u9fa5]/;
if (chineseRegex.test(text)) {
  return 'zh';
}

// Check for English characters
const englishRegex = /[a-zA-Z]/;
if (englishRegex.test(text)) {
  return 'en';
}

return 'unknown';
```

### Supported Languages

1. **English** (en)
   - Default language
   - Full support

2. **Chinese** (zh)
   - Simplified Chinese
   - Full support

3. **Extensible**
   - Can add more languages
   - Follow same pattern

---

## Model Support

### OpenAI Integration

**Model**: GPT-5.2 (`gpt-5.2`)

**Configuration**:
```typescript
{
  model: 'gpt-5.2',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory
  ],
  stream: true,
  temperature: 0.7
}
```

### Claude Integration

**Model**: Claude Opus 4.6 (`claude-opus-4-6`)

**Configuration**:
```typescript
{
  model: 'claude-opus-4-6',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: conversationHistory,
  stream: true
}
```

---

## Conversation Management

### History Structure

**Type Definition**:
```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
  version?: number;  // Page version number
}
```

### Storage

**Location**: Cloudflare R2

**File Format**: `{uuid}.history.json`

**Example**:
```json
[
  {
    "role": "user",
    "content": "一个音乐播放器应用",
    "timestamp": "2026-03-01T12:00:00.000Z"
  },
  {
    "role": "assistant",
    "content": "Generated initial page based on your description.",
    "timestamp": "2026-03-01T12:00:05.000Z",
    "version": 1
  }
]
```

### Lifecycle

1. **Initial Creation**: First user description + AI confirmation
2. **Modifications**: User feedback + AI update confirmation
3. **Persistence**: Saved to R2 after each interaction
4. **Retrieval**: Loaded on page mount
5. **Display**: Shown in chat sidebar

---

## HTML Extraction

### Process

**Function**: `extractHtml(response: string)`

**Purpose**: Clean AI response to get pure HTML

**Steps**:
1. Trim whitespace
2. Remove markdown code blocks
3. Extract HTML content

---

## Error Handling

### API Errors

**Scenarios**:
- Invalid API key
- Rate limiting
- Network issues
- Model errors

**Handling**:
- Display error message
- Preserve user input
- Suggest retry

---

## Last Updated

2026-03-03
