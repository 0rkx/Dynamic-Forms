# Dynamic Forms - AI Manifesto System

This folder contains utility scripts for managing AI manifestos in Dynamic Forms. The AI manifesto system guides intelligent follow-up questions in forms to provide deeper insights from users.

## Setup

Before using the scripts, install the required dependencies:

**Windows:**
```
cd backend
install-functions.bat
```

**Mac/Linux:**
```
cd backend
chmod +x install-functions.sh
./install-functions.sh
```

## Repairing Manifestos

If you ever experience issues with AI follow-up questions not working correctly, you can use the repair tool to fix manifesto synchronization between database tables:

**Windows:**
```
cd backend
repair-manifestos.bat
```

**Mac/Linux:**
```
cd backend
chmod +x repair-manifestos.sh
./repair-manifestos.sh
```

### Command Line Options

- `--force`: Force repair of all manifestos, even if they appear to be working
- `--form-id=YOUR_FORM_ID`: Only repair a specific form

Example:
```
repair-manifestos.bat --force
```

## How Manifestos Work

Each form with intelligent follow-ups has an associated manifesto that includes:

1. **Product Vision**: Core purpose of the form
2. **Target Audience**: Who the form is designed for
3. **Key Question Areas**: Topics for follow-up questions
4. **Conversation Tone**: How the AI should interact with users

The system uses these guidelines to generate relevant follow-up questions based on user responses, creating a more interactive and insightful form experience.

## Database Schema

Manifestos are stored in two synchronized tables:

- `form_manifestos`: Primary storage for manifesto data
- `user_manifesto_context`: Used by the AI system for generating follow-ups

The repair tool ensures both tables remain synchronized for proper functioning. 