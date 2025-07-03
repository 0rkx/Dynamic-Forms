# Dynamic Forms - AI Conversation Brain

Transform static forms into intelligent, adaptive conversations that maximize engagement and gather richer data.

## 🧠 AI Conversation Brain (Featured)

The revolutionary **AI Conversation Brain** turns your forms into natural conversations:

- **Intelligent Flow**: AI analyzes responses and decides what to ask next
- **Dynamic Questions**: Generates contextual follow-ups based on user answers
- **User Adaptation**: Detects communication styles and adapts conversation tone
- **Engagement Optimization**: Monitors user engagement and adjusts flow in real-time

### How It Works
1. **Create a Skeleton**: Design 3-5 core questions as your form structure
2. **Set Conversation Goal**: Define what you want to achieve
3. **Enable AI Brain**: Configure style (professional, friendly, casual, expert)
4. **Let AI Expand**: The brain intelligently adds questions and adapts the flow

## Features

### 🎨 Interactive Question Types
- **Quick Select**: Fast, visual button-based selections with gradients
- **Mood Selector**: Emoji-based emotional response capture
- **Interactive Slider**: Visual range inputs with real-time feedback
- **Budget Range**: Intuitive financial selection with visual cues
- **Conversation Breaks**: AI-powered natural transitions

### 🚀 Core Platform
- 🤖 **AI-Powered Forms**: Intelligent follow-up questions using Gemini AI
- 📊 **Export Options**: CSV, JSON, and Google Sheets integration
- 🔒 **Secure Authentication**: Supabase-powered user management
- 📈 **Real-time Analytics**: Form performance and response analysis
- 🎨 **Modern UI**: Beautiful, responsive design with smooth animations
- 🚀 **Fast Performance**: Built with React, TypeScript, and Vite

## Run Locally

**Prerequisites:** Node.js 16+ and npm

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your API keys (see setup guides below)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## Setup Guides

- **[Supabase Setup](SUPABASE_SETUP.md)** - Database and authentication
- **[Google Sheets Integration](GOOGLE_SHEETS_SETUP.md)** - Export responses to Google Sheets
- **Database Schema**: See `supabase-schema.sql` for the complete database structure

## Environment Variables

Key environment variables needed:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Features
GEMINI_API_KEY=your-gemini-api-key

# Google Sheets Integration (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_API_KEY=your-google-api-key
```

## Export Features

### Google Sheets Integration
- **One-click export** to Google Sheets
- **Automatic formatting** with headers and proper column sizing
- **Follow-up questions included** with clear labeling
- **Real-time creation** of shareable spreadsheets

See [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md) for detailed configuration instructions.

## Documentation

- **[Features Documentation](FEATURES_DOCUMENTATION.md)** - Complete feature overview
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Deployment guidelines
- **[Security Fixes](SECURITY_FIXES.md)** - Security considerations

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Google Gemini AI
- **Integrations**: Google Sheets API
- **Build Tool**: Vite
- **Animations**: Framer Motion
