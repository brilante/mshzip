/**
 * 번역 서비스 (경량 버전)
 * 원본(mymind3) TranslationService와 인터페이스 호환
 * AI 번역 대신 원본 텍스트 fallback 반환
 *
 * @version 1.0.0
 */

'use strict';

const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh-TW', 'zh-CN'];

class TranslationService {
  /**
   * 다국어 일괄 번역 (스텁: 원본 언어만 반환)
   * @param {string} text - 번역할 텍스트
   * @param {string} sourceLang - 원본 언어 코드
   * @returns {Object} 언어별 번역 객체
   */
  static async translateToAllLanguages(text, sourceLang = 'ko') {
    const result = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      result[lang] = text;
    }
    return result;
  }

  /**
   * 사용자 언어에 맞는 텍스트 반환
   * @param {Object|string} translations - 번역 객체 또는 JSON 문자열
   * @param {string} userLang - 사용자 언어
   * @param {string} fallback - 기본값
   * @returns {string} 번역된 텍스트
   */
  static getLocalizedText(translations, userLang = 'ko', fallback = '') {
    if (!translations) return fallback;

    let trans = translations;
    if (typeof translations === 'string') {
      try {
        trans = JSON.parse(translations);
      } catch {
        return fallback;
      }
    }

    // 5단계 fallback: 정확한 언어 → 기본 코드 → ko → en → 첫 번째
    const baseLang = userLang.split('-')[0];
    return trans[userLang]
      || trans[baseLang]
      || trans['ko']
      || trans['en']
      || Object.values(trans)[0]
      || fallback;
  }

  /**
   * 지원 언어 목록
   */
  static getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * 번역 객체 유효성 검증
   */
  static isValidTranslation(translations) {
    if (!translations || typeof translations !== 'object') return false;
    return SUPPORTED_LANGUAGES.every(lang => translations[lang]);
  }

  /**
   * 게시글 내용 번역 (스텁: 원본 반환)
   */
  static async translateContent(title, content, fileNames = [], targetLang = 'en') {
    return {
      title: title || '',
      content: content || '',
      fileNames: fileNames || []
    };
  }
}

module.exports = TranslationService;
