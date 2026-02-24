'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/ai/capabilities - AI 기능 목록 (스텁)
 */
router.get('/capabilities', (req, res) => {
  logger.info('AI 기능 요청 (스텁)');
  res.json({
    success: true,
    data: {
      gpt: {
        'gpt-4o': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: 'text,image',
          outputIcons: 'text',
          maxTokens: 128000,
          description: '가장 강력한 GPT 모델'
        },
        'gpt-4o-mini': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: 'text,image',
          outputIcons: 'text',
          maxTokens: 128000,
          description: '빠르고 효율적인 GPT 모델'
        }
      },
      claude: {
        'claude-sonnet-4-20250514': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: 'text,image',
          outputIcons: 'text',
          maxTokens: 200000,
          description: '균형 잡힌 Claude 모델'
        }
      }
    },
    pricing: {
      gpt: {
        'gpt-4o': { inputCost: 2.5, outputCost: 10, cachedCost: 1.25 },
        'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6, cachedCost: 0.075 }
      },
      claude: {
        'claude-sonnet-4-20250514': { inputCost: 3, outputCost: 15, cachedCost: 1.5 }
      }
    }
  });
});

module.exports = router;
