import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }
  
  try {
    console.log('Received request to /api/tailor');
    
    const { resumeText, jobDescription, apiKey } = req.body;
    
    // Validate required fields
    if (!resumeText || !jobDescription) {
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields: resumeText and jobDescription' 
      });
      return;
    }
    
    // Validate API key
    if (apiKey !== process.env.SERVICE_API_KEY) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid API key' 
      });
      return;
    }
    
    console.log('Calling Claude API...');
    
    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `You are an expert resume writer. Create tailored resume content for a job posting.

CRITICAL RULES:
1. Each bullet MUST be 20-25 words with specific numbers
2. Use exact keywords from job posting naturally
3. Be SPECIFIC not generic
4. Include business outcomes with metrics

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME:
${resumeText}

OUTPUT THIS EXACT JSON (no markdown):

{
  "professionalTitle": "Job title from posting",
  "frameworks": ["Framework1", "Framework2"],
  "summary": "3-4 sentences addressing top job requirements with exact phrases",
  "skills": {
    "frameworks": ["SOX 404", "ISO 27001"],
    "coreCompetencies": ["Skill1", "Skill2"],
    "technical": ["Technical skill"],
    "tools": ["Tool1", "Tool2"]
  },
  "experience": [
    {
      "title": "Original job title",
      "company": "Original company",
      "location": "Original location",
      "dates": "Original dates",
      "bullets": [
        "20-25 word bullet with specific context, job keywords, and quantified results",
        "Another specific bullet"
      ]
    }
  ]
}

Output ONLY the JSON.`
      }]
    });
    
    // Parse response
    let content = message.content[0].text.trim();
    
    // Remove markdown if present
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const tailoredContent = JSON.parse(content);
    
    // Calculate cost
    const inputCost = (message.usage.input_tokens / 1000000) * 3;
    const outputCost = (message.usage.output_tokens / 1000000) * 15;
    const totalCost = inputCost + outputCost;
    
    console.log(`Success! Cost: $${totalCost.toFixed(4)}`);
    
    // Return success
    res.status(200).json({
      success: true,
      content: tailoredContent,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        totalCost: totalCost,
        formattedCost: `$${totalCost.toFixed(4)}`
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
}
