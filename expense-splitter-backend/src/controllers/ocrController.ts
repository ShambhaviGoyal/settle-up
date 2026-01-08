import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const processReceipt = async (req: AuthRequest, res: Response) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Image data required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt image and extract the following information in JSON format:
              {
                "total": <total amount as number>,
                "subtotal": <subtotal before tax/tip as number, if available>,
                "tax": <tax amount as number, if available, otherwise 0>,
                "tip": <tip amount as number, if available, otherwise 0>,
                "items": [{"name": "item name", "price": <price as number>}],
                "vendor": "store/restaurant name",
                "date": "YYYY-MM-DD format",
                "category": "one of: food, shopping, entertainment, transport, utilities, other"
              }
              Only return valid JSON, nothing else.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const receiptData = JSON.parse(jsonMatch[0]);
      res.json({ success: true, data: receiptData });
    } else {
      res.status(400).json({ error: 'Could not parse receipt' });
    }
  } catch (error: any) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
};