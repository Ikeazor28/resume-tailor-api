import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { resumeText, jobDescription, apiKey } = req.body;
    
    // Validate request
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ 
        error: 'Missing required fields: resumeText and jobDescription' 
      });
    }
    
    // Validate API key (protect your service)
    if (apiKey !== process.env.SERVICE_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }
    
    console.log('Processing resume tailoring request...');
    
    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `You are an expert resume writer. Create tailored resume content for a job posting.

CRITICAL RULES:
1. Each bullet MUST be 20-25 words with specific numbers and metrics
2. Use exact keywords from job posting naturally (not forced)
3. Be SPECIFIC not generic:
   - ❌ "critical systems" → ✅ "payment processing infrastructure handling $10B+ annually"
   - ❌ "enterprise environment" → ✅ "AWS cloud spanning 3 regions with 200+ EC2 instances"
4. Include business outcomes with dollar amounts, percentages, or timelines
5. Each bullet tells a story: [specific context] → [action with job keywords] → [quantified result]

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME:
${resumeText}

ANALYZE THE JOB:
1. Extract top 5 requirements from job posting
2. Identify responsibility keywords (for experience bullets)
3. Identify qualification keywords (for summary only)
4. Identify technical keywords (frameworks, tools, certifications)

OUTPUT THIS EXACT JSON STRUCTURE (no markdown, no code blocks):

{
  "professionalTitle": "Exact job title from posting",
  "frameworks": ["Key framework or cert from job", "Another framework"],
  "summary": "3-4 sentences addressing the top 5 job requirements using their exact phrases. Start with job title, include years of experience, mention specific capabilities from job posting. Example: 'Cybersecurity Engineer with 8+ years leading RMF accreditation efforts and gaining/maintaining system ATOs across regulated environments. Proven expertise in POA&M development, SECONOPS documentation, and coordinating with multiple Approving Organizations. CISSP, CISM certified with deep DevSecOps implementation experience.'",
  "skills": {
    "frameworks": ["SOX 404", "ISO 27001", "NIST RMF", "SSAE 18"],
    "coreCompetencies": ["Competency from job responsibilities", "Another competency"],
    "technical": ["Technical skill from job", "Another skill"],
    "tools": ["Tool mentioned in job", "Another tool"]
  },
  "experience": [
    {
      "title": "Keep original job title from resume",
      "company": "Keep original company name",
      "location": "Keep original location",
      "dates": "Keep original dates",
      "bullets": [
        "20-25 word bullet: [Specific context with numbers] + [Action using job keywords] + [Business outcome with dollar/percentage/timeline]. Example: 'Led 15+ IT audit engagements for Fortune 500 banking clients managing $2M+ budgets, maintaining 98% client satisfaction through proactive risk identification across 50+ SOX controls'",
        "Another 20-25 word bullet with different job keywords and specific achievements",
        "Continue with 4-6 bullets for current role, 3-4 for previous roles"
      ]
    }
  ]
}

QUALITY CHECKS BEFORE OUTPUTTING:
1. ✓ Every bullet is 20-25 words? (count them!)
2. ✓ Every bullet has specific numbers (counts, dollars, percentages)?
3. ✓ No generic phrases ("critical systems", "various activities")?
4. ✓ Job keywords naturally integrated (not keyword-stuffed)?
5. ✓ Business outcomes clearly stated?
6. ✓ Summary mirrors exact phrases from job posting?

If ANY check fails, rewrite until they all pass.

Output ONLY the JSON. No explanations, no markdown formatting.`
      }]
    });
    
    // Parse Claude's response
    let content = message.content[0].text.trim();
    
    // Remove markdown if Claude added it (sometimes it does)
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    // Parse JSON
    const tailoredContent = JSON.parse(content);
    
    // Calculate cost
    const inputCost = (message.usage.input_tokens / 1000000) * 3;
    const outputCost = (message.usage.output_tokens / 1000000) * 15;
    const totalCost = inputCost + outputCost;
    
    console.log(`Request successful. Cost: $${totalCost.toFixed(4)}`);
    
    // Return successful response
    return res.status(200).json({
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
    console.error('Error processing request:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
}
