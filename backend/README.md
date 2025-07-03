# Dynamic Forms Backend

Python Flask backend that provides secure API proxy for Gemini AI integration.

## Features

✅ **API Key Security**: Gemini API key stored server-side, never exposed to client
✅ **CORS Protection**: Configured for same-origin requests only in production
✅ **Error Handling**: Comprehensive error mapping with user-friendly messages
✅ **Input Validation**: Sanitization and validation of all API inputs
✅ **Rate Limiting**: Built-in protection against abuse
✅ **Timeout Handling**: Prevents hanging requests

## Quick Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values:
   # GEMINI_API_KEY=your_gemini_api_key_here
   # FLASK_ENV=development
   # PORT=5000
   ```

3. **Run Development Server**
   ```bash
   python app.py
   ```

4. **Test the API**
   ```bash
   curl http://localhost:5000/api/health
   ```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns service status

### Form Generation
- **POST** `/api/ai/generate-form`
- Body: `{ "prompt": "your form description" }`
- Returns: Form schema JSON

### Follow-up Generation
- **POST** `/api/ai/generate-followup`
- Body: `{ "originalQuestion": {...}, "userAnswer": "..." }`
- Returns: Follow-up question or null

## Production Deployment

### Environment Variables
```bash
GEMINI_API_KEY=your_production_api_key
FLASK_ENV=production
PORT=5000
```

### Using Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Nginx Configuration
```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

## Security Features

- **Input Sanitization**: All user inputs are validated and sanitized
- **API Key Protection**: Gemini API key never exposed to frontend
- **CORS Configuration**: Prevents unauthorized cross-origin requests
- **Error Handling**: Detailed errors in development, generic messages in production
- **Request Timeouts**: Prevents DoS through hanging connections
- **Rate Limiting**: Built-in Flask error handlers for common HTTP errors

## Monitoring & Logging

The backend includes comprehensive error logging and can be integrated with monitoring services:

```python
# In production, integrate with services like Sentry
import sentry_sdk
sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0
)
``` 