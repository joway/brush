# AI Agents Design

This document describes the AI agents used in Magic Brush and their prompt engineering.

## Overview

Magic Brush uses AI agents to transform product descriptions into interactive HTML prototypes. The agents are designed to:

1. Understand product requirements in natural language
2. Generate complete, self-contained HTML prototypes
3. Support iterative modifications through conversation
4. Maintain language consistency with user input

---

## Agent Architecture

### Design Agent

**Location**: `frontend/src/agents/DesignAgent.ts`

**Purpose**: Core agent responsible for generating and modifying product prototypes

**Capabilities**:
- Generate initial HTML prototypes from product descriptions
- Modify existing prototypes based on user feedback
- Support both OpenAI (GPT-4) and Claude (Sonnet 3.5)
- Streaming responses for real-time progress feedback
- Conversation history management

---

## System Prompt

**File**: `frontend/src/agents/prompts.ts`

### Core Directive

```
You are an expert Product Design AI that creates interactive product prototypes.

Your task is to generate a complete, self-contained HTML prototype based on user requirements.
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

**Example**:
- User input (Chinese): "一个待办事项应用" → HTML UI in Chinese
- User input (English): "A todo list app" → HTML UI in English

#### 2. Input Validation

**Rule**:
```
If the user input is NOT a product requirement, respond with rejection message in user's language.
```

**Rejection Messages**:
- English: "I can only help design product prototypes. Please describe a product you want to build."
- Chinese: "我只能帮助设计产品原型。请描述你想要构建的产品。"

**Validation Logic**:
- Check for product/design keywords
- Reject casual chat or unrelated questions
- Provide clear guidance for valid input

#### 3. Output Format

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

#### 4. Data & Interactivity Requirements

**Rule**:
```
Use realistic mock data and show it by default. Make key flows interactive on that data.
Do NOT use external images; use simple CSS shapes/gradients/placeholders instead.
```

**Implementation**:
- Provide mock items for lists/cards/tables (e.g., posts, products, tasks)
- Make interactions functional (e.g., list → detail view)
- Avoid external images; illustrate visuals with CSS

#### 5. Design Quality Standards

**Visual Design**:
- Modern, clean, professional UI
- Responsive design (mobile-friendly)
- Good color schemes and typography
- Smooth animations and transitions
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

Please analyze this product requirement and generate a complete HTML prototype.

Think through:
1. What is the core functionality of this product?
2. Who are the target users?
3. What are the main user flows and interactions?
4. What UI components are needed?
5. What's the information hierarchy?

Then generate a single, complete HTML file that demonstrates this product prototype.

CRITICAL:
- Use the same language as the user's description for all UI text in the HTML.
- Use realistic mock data and make it visible by default.
- Ensure key interactions work on the mock data (e.g., list to detail view).
- Do NOT use external images; use CSS shapes/gradients/placeholders instead.
```

**Purpose**:
- Guides initial prototype generation
- Encourages thoughtful analysis
- Ensures language consistency

### 2. Modification Prompt

**Function**: `getModificationPrompt(currentHtml: string, userFeedback: string)`

**Template**:
```typescript
Current HTML prototype:
${currentHtml}

User Feedback:
${userFeedback}

Please modify the HTML prototype based on the user's feedback.

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
│    - Product description                                    │
│    - Natural language (any language)                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Validation                                               │
│    - Check if input is product requirement                  │
│    - Detect language                                        │
│    - Reject if not valid                                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent Processing                                         │
│    - Send to LLM with system prompt                         │
│    - Stream response                                        │
│    - Parse HTML output                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Output Processing                                        │
│    - Extract HTML from response                             │
│    - Remove markdown blocks if present                      │
│    - Save to storage                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Render                                                   │
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
│    - Show updated prototype                                 │
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

## Validation Logic

### Product Requirement Detection

**File**: `frontend/src/agents/prompts.ts`

**Function**: `isProductRequirement(text: string)`

**Keywords** (multilingual):

**English**:
- app, website, product, build, create, design, develop
- platform, system, tool, interface, page, feature, user
- dashboard, form, login, signup, profile, search, list
- button, menu, navigation, home, landing

**Chinese**:
- 产品, 应用, 网站, 页面, 系统, 平台, 工具
- 设计, 开发, 构建, 创建, 功能, 用户, 界面
- 登录, 注册, 搜索, 列表, 按钮, 菜单, 导航
- 首页, 仪表板, 表单

**Algorithm**:
```typescript
const keywords = [ /* ... */ ];
const lowerText = text.toLowerCase();
return keywords.some(keyword =>
  lowerText.includes(keyword.toLowerCase())
);
```

---

## Model Support

### OpenAI Integration

**Model**: GPT-4 Turbo (`gpt-4-turbo-preview`)

**Configuration**:
```typescript
{
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory
  ],
  stream: true,
  temperature: 0.7
}
```

**Features**:
- Streaming support
- Large context window
- High-quality code generation

### Claude Integration

**Model**: Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)

**Configuration**:
```typescript
{
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: conversationHistory,
  stream: true
}
```

**Features**:
- Streaming support
- Excellent design understanding
- Strong multilingual support

---

## Conversation Management

### History Structure

**Type Definition**:
```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
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
    "content": "Generated initial product prototype based on your description.",
    "timestamp": "2026-03-01T12:00:05.000Z"
  },
  {
    "role": "user",
    "content": "添加播放列表功能",
    "timestamp": "2026-03-01T12:05:00.000Z"
  },
  {
    "role": "assistant",
    "content": "Updated the prototype based on your feedback.",
    "timestamp": "2026-03-01T12:05:10.000Z"
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

**Implementation**:
```typescript
let html = response.trim();

// Remove ```html and ``` if present
if (html.startsWith('```html')) {
  html = html.replace(/^```html\n?/, '');
} else if (html.startsWith('```')) {
  html = html.replace(/^```\n?/, '');
}

if (html.endsWith('```')) {
  html = html.replace(/\n?```$/, '');
}

return html.trim();
```

---

## Error Handling

### Validation Errors

**Scenario**: Non-product input

**Response**: Localized rejection message

**Example**:
```
User: "Hello"
Agent: "I can only help design product prototypes. Please describe a product you want to build."
```

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

### HTML Generation Errors

**Scenarios**:
- Incomplete HTML
- Malformed structure
- Missing required tags

**Handling**:
- Retry generation
- Log error details
- Provide feedback to user

---

## Best Practices

### Prompt Engineering

1. **Be Specific**: Clear requirements in system prompt
2. **Provide Examples**: Show expected output format
3. **Set Constraints**: Define what NOT to do
4. **Use Structured Thinking**: Guide AI reasoning process
5. **Enforce Consistency**: Repeat critical rules

### Agent Design

1. **Stateless Operations**: Each request is independent
2. **Context Management**: Include relevant history
3. **Progressive Enhancement**: Start simple, add complexity
4. **Graceful Degradation**: Handle partial failures
5. **User Feedback**: Show progress and status

### Code Quality

1. **English Comments**: All code comments in English
2. **Clean Output**: No debugging logs in production
3. **Semantic HTML**: Proper HTML5 structure
4. **Modern CSS**: Use Tailwind or modern CSS
5. **Vanilla JS**: Avoid heavy frameworks

---

## Future Improvements

### Potential Enhancements

1. **Multi-turn Refinement**
   - Ask clarifying questions
   - Suggest alternatives
   - Provide design options

2. **Component Library**
   - Reusable UI patterns
   - Consistent design system
   - Faster generation

3. **Design Templates**
   - Pre-built layouts
   - Industry-specific templates
   - Style presets

4. **Advanced Validation**
   - Accessibility checks
   - Performance analysis
   - Browser compatibility

5. **Export Options**
   - Download as ZIP
   - Export to Figma
   - Generate React components

### Model Improvements

1. **Fine-tuning**
   - Train on design patterns
   - Improve HTML quality
   - Better language support

2. **Multimodal Input**
   - Sketch recognition
   - Screenshot analysis
   - Design mockup understanding

3. **Specialized Models**
   - UI-specific models
   - Design-focused training
   - Domain expertise

---

## Performance Metrics

### Response Time

**Target**:
- Initial generation: < 30 seconds
- Modifications: < 20 seconds
- Streaming: Real-time feedback

### Quality Metrics

**HTML Quality**:
- Valid HTML5
- Responsive design
- Cross-browser compatible
- Accessible

**Design Quality**:
- Professional appearance
- Consistent styling
- Proper spacing
- Good typography

### User Experience

**Success Rate**:
- Valid product requirements: > 95%
- Successful generations: > 90%
- Language consistency: 100%

---

## Testing

### Unit Tests

**Validation**:
```typescript
test('detects product requirements', () => {
  expect(isProductRequirement('build a todo app')).toBe(true);
  expect(isProductRequirement('hello')).toBe(false);
});

test('detects language', () => {
  expect(detectLanguage('一个应用')).toBe('zh');
  expect(detectLanguage('an app')).toBe('en');
});
```

### Integration Tests

**Agent Behavior**:
- Generate with valid input
- Reject invalid input
- Maintain language consistency
- Handle streaming responses

### E2E Tests

**Full Workflow**:
1. User enters description
2. Agent generates HTML
3. HTML displays correctly
4. User modifies design
5. Agent updates HTML
6. History persists

---

## References

### Documentation

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

### Related Files

- `frontend/src/agents/DesignAgent.ts` - Agent implementation
- `frontend/src/agents/prompts.ts` - Prompt templates
- `frontend/src/utils/api.ts` - API utilities
- `workers/src/index.ts` - Backend API

---

## License

MIT License - See LICENSE file for details

---

**Last Updated**: 2026-03-01

**Maintained By**: Magic Brush Team
