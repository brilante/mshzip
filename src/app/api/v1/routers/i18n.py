"""
다국어(i18n) API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import I18nLanguage, I18nTranslation, I18nUnitPreference

router = APIRouter(prefix='/api/i18n', tags=['i18n'])


@router.get('/languages')
async def get_languages(db: AsyncSession = Depends(get_db)):
  """지원 언어 목록 조회"""
  result = await db.execute(
    select(I18nLanguage)
    .where(I18nLanguage.is_active == True)
    .order_by(I18nLanguage.sort_order)
  )
  langs = result.scalars().all()
  return {
    'success': True,
    'data': {
      'languages': [
        {
          'lang_code': l.lang_code,
          'lang_name': l.lang_name,
          'native_name': l.native_name,
          'is_rtl': l.is_rtl,
          'is_active': l.is_active,
        }
        for l in langs
      ]
    },
    'error': None,
  }


@router.get('/units')
async def get_all_units(db: AsyncSession = Depends(get_db)):
  """전체 언어별 단위 환경설정 조회"""
  result = await db.execute(select(I18nUnitPreference))
  units = result.scalars().all()
  data = {}
  for u in units:
    data[u.lang_code] = {
      'lang_code': u.lang_code,
      'currency_code': u.currency_code,
      'date_format': u.date_format,
      'time_format': u.time_format,
      'number_decimal': u.number_decimal,
      'number_grouping': u.number_grouping,
      'temperature_unit': u.temperature_unit,
      'distance_unit': u.distance_unit,
    }
  return {'success': True, 'data': {'units': data}, 'error': None}


@router.get('/units/{lang_code}')
async def get_units(lang_code: str, db: AsyncSession = Depends(get_db)):
  """특정 언어의 단위 환경설정 조회"""
  unit = await db.get(I18nUnitPreference, lang_code)
  if not unit:
    # 폴백: en
    unit = await db.get(I18nUnitPreference, 'en')
  if not unit:
    return {'success': True, 'data': {'unit': None}, 'error': None}
  return {
    'success': True,
    'data': {
      'unit': {
        'lang_code': unit.lang_code,
        'currency_code': unit.currency_code,
        'date_format': unit.date_format,
        'time_format': unit.time_format,
        'number_decimal': unit.number_decimal,
        'number_grouping': unit.number_grouping,
        'temperature_unit': unit.temperature_unit,
        'distance_unit': unit.distance_unit,
      }
    },
    'error': None,
  }


@router.get('/{lang_code}')
async def get_translations(
  lang_code: str,
  category: str | None = Query(None),
  db: AsyncSession = Depends(get_db),
):
  """특정 언어의 번역 데이터 조회"""
  query = select(I18nTranslation).where(I18nTranslation.lang_code == lang_code)
  if category:
    query = query.where(I18nTranslation.category == category)

  result = await db.execute(query)
  translations = result.scalars().all()

  if not translations:
    # 폴백: en
    query = select(I18nTranslation).where(I18nTranslation.lang_code == 'en')
    if category:
      query = query.where(I18nTranslation.category == category)
    result = await db.execute(query)
    translations = result.scalars().all()

  # key-value 객체로 변환
  data = {}
  for t in translations:
    data[t.translation_key] = t.translation_text

  return {
    'success': True,
    'data': {'langCode': lang_code, 'translations': data},
    'error': None,
  }
