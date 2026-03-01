# Usage Guide

## Getting Started

### 1. Obtain an API Key

You'll need an API key from either:

- **OpenAI**: https://platform.openai.com/api-keys
  - Create an account
  - Navigate to API Keys
  - Create a new secret key (starts with `sk-...`)

- **Claude (Anthropic)**: https://console.anthropic.com/
  - Create an account
  - Navigate to API Keys
  - Create a new API key (starts with `sk-ant-...`)

### 2. Access the Application

Go to your deployed URL or run locally:

```bash
npm run dev
```

### 3. Create Your First Prototype

1. **Enter API Key**: Paste your OpenAI or Claude API key
2. **Describe Your Product**: Write a detailed description

**Example descriptions:**

English:
```
A task management app with the following features:
- Create, edit, and delete tasks
- Drag and drop to reorder
- Categories and tags
- Dark mode toggle
- Progress tracking with statistics
```

Chinese:
```
一个在线笔记应用，包含以下功能：
- 创建、编辑和删除笔记
- Markdown 支持
- 文件夹分类
- 搜索功能
- 深色模式
```

3. **Click "Design"**: The AI will generate an interactive prototype
4. **Wait for Generation**: This may take 30-60 seconds

### 4. View and Test the Prototype

- The prototype opens in a new view
- It's fully interactive - click buttons, fill forms, etc.
- Test all the features you described

### 5. Iterate and Refine

1. **Click the chat icon** in the top-right corner
2. **Describe changes** you want to make

**Example modifications:**

```
Change the primary color to blue
Add a search bar at the top
Make the cards larger
Add animation when tasks are completed
```

3. **Apply changes** and the prototype will update

## Tips for Best Results

### Writing Good Product Descriptions

✅ **Do:**
- Be specific about features and functionality
- Mention the target users
- Describe the main user flows
- Specify design preferences (colors, style, layout)
- Include technical requirements (forms, authentication, etc.)

❌ **Don't:**
- Be too vague ("make a website")
- Use overly technical jargon
- Mix multiple unrelated product ideas
- Expect pixel-perfect production code

### Examples of Good Descriptions

**Simple:**
```
A landing page for a fitness app with:
- Hero section with call-to-action
- Feature highlights (3-4 features)
- Pricing table (3 tiers)
- Contact form
- Modern, energetic design with green accents
```

**Medium Complexity:**
```
An e-commerce product page for headphones:
- Product images (carousel)
- Product details and specifications
- Color and size selector
- Add to cart button
- Customer reviews section
- Related products
- Sticky header with cart icon
```

**Complex:**
```
A dashboard for a project management tool:
- Sidebar navigation (Projects, Tasks, Team, Settings)
- Project overview with statistics
- Kanban board with draggable cards
- Task list with filters (status, assignee, date)
- Team member avatars
- Dark mode support
- Responsive design
```

### Iterating Effectively

**First iteration:**
- Get the basic structure and features right
- Don't worry about perfect colors or spacing

**Second iteration:**
- Refine the design (colors, fonts, spacing)
- Add polish (animations, hover effects)

**Third iteration:**
- Fine-tune specific details
- Add edge cases or additional features

## Language Support

The AI automatically detects your input language and uses the same language in the generated HTML.

- **English input** → English UI
- **Chinese input** → Chinese UI
- **Mixed input** → Defaults to English

## Privacy and Security

✅ **Your data is safe:**
- API keys are stored in browser sessionStorage (cleared on tab close)
- Keys are never sent to our servers
- AI processing happens directly between your browser and OpenAI/Claude
- Generated HTML is stored in Cloudflare R2 with random UUIDs

⚠️ **Important:**
- Don't share your API key with others
- Don't commit API keys to version control
- Monitor your API usage on OpenAI/Claude dashboards

## Troubleshooting

### "Failed to generate prototype"

**Possible causes:**
1. Invalid API key
2. Insufficient API credits
3. Rate limiting
4. Network issues

**Solutions:**
- Verify your API key is correct
- Check your API account has credits
- Wait a moment and try again
- Check browser console for errors

### "I can only help design product prototypes"

This means your input wasn't recognized as a product description.

**Fix:** Describe a product or app, not a general question.

### Prototype doesn't look right

**Try:**
- Be more specific in your description
- Use the chat to request specific changes
- Mention design preferences explicitly

### Chat modifications not working

**Check:**
- You're on the same device/browser (API key in session)
- You have a stable internet connection
- Your API key still has credits

## Best Practices

1. **Start Simple**: Begin with core features, add complexity later
2. **Test Thoroughly**: Click everything in the prototype
3. **Iterate Gradually**: Make small changes, not complete redesigns
4. **Save Your URL**: Bookmark prototype URLs to revisit later
5. **Use Examples**: Look at similar products for inspiration

## Limitations

- **Not production code**: Prototypes are for demonstration, not deployment
- **No backend**: All functionality is frontend-only (mocked data)
- **No authentication**: Any visitor with the URL can view prototypes
- **Storage**: Prototypes stored indefinitely (until R2 bucket cleared)
- **No version history**: Each modification overwrites the previous version

## Advanced Usage

### Using Custom Styles

Request specific styling frameworks:
```
Use Tailwind CSS with a minimalist design
Style similar to Apple's website
Modern glassmorphism design
```

### Requesting Interactions

Be explicit about interactions:
```
Add smooth transitions when hovering buttons
Animate cards sliding in on page load
Modal popup when clicking the login button
```

### Mobile Optimization

Request responsive design:
```
Make sure it works well on mobile devices
Add a hamburger menu for mobile
Stack the cards vertically on small screens
```

## FAQ

**Q: Can I download the HTML?**
A: Yes, view source or use browser developer tools to copy the HTML.

**Q: Can I use this for production?**
A: The prototypes are for demonstration. You'd need to rebuild with proper backend, security, and optimization for production.

**Q: How long are prototypes stored?**
A: Indefinitely, until manually deleted or R2 bucket cleared.

**Q: Can I share prototypes?**
A: Yes, just share the URL. Anyone can view it.

**Q: Does it cost money?**
A: You pay only for API usage (OpenAI/Claude charges). The Cloudflare infrastructure is free for most usage.

**Q: Can I customize the AI model?**
A: Currently uses GPT-4 Turbo for OpenAI and Claude 3.5 Sonnet for Anthropic.

**Q: What if I don't have an API key?**
A: You must have an API key to use this tool. Sign up for OpenAI or Anthropic.

## Getting Help

If you encounter issues:

1. Check this usage guide
2. Review the deployment documentation
3. Check browser console for errors
4. Verify API key and credits
5. Try a different browser

Enjoy designing with AI! 🎨
