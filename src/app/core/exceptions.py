"""전역 예외 정의."""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """앱 기본 예외."""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedException(AppException):
    """인증 실패."""

    def __init__(self, detail: str = '인증이 필요합니다.'):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    """권한 없음."""

    def __init__(self, detail: str = '권한이 없습니다.'):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundException(AppException):
    """리소스 미발견."""

    def __init__(self, detail: str = '리소스를 찾을 수 없습니다.'):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class InsufficientCreditsException(AppException):
    """크레딧 부족."""

    def __init__(self, detail: str = '크레딧이 부족합니다.'):
        super().__init__(detail=detail, status_code=status.HTTP_402_PAYMENT_REQUIRED)
