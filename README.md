# Resume Tailoring API

Microservice that uses Claude API to tailor resumes to specific job descriptions.

## API Endpoint

`POST /api/tailor`

## Request Body

```json
{
  "apiKey": "your-service-api-key",
  "resumeText": "Original resume text...",
  "jobDescription": "Job posting text..."
}
```

## Response

```json
{
  "success": true,
  "content": {
    "professionalTitle": "Job Title",
    "summary": "Tailored summary...",
    "experience": [...]
  },
  "usage": {
    "inputTokens": 1500,
    "outputTokens": 2000,
    "totalCost": 0.0345,
    "formattedCost": "$0.0345"
  }
}
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key from console.anthropic.com
- `SERVICE_API_KEY` - Secret key to protect your API (make up a secure string)

## Deployment

This is designed to be deployed on Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Testing

```bash
curl -X POST https://your-api-url.vercel.app/api/tailor \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-service-key",
    "resumeText": "Your resume...",
    "jobDescription": "Job description..."
  }'
```
