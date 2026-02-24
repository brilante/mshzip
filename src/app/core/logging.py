"""structlog 기반 로깅 설정."""

import logging

import structlog


def setup_logging(debug: bool = False) -> None:
    """structlog 초기화."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt='iso'),
            structlog.dev.ConsoleRenderer() if debug
            else structlog.processors.JSONRenderer(ensure_ascii=False),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.DEBUG if debug else logging.INFO
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """이름이 지정된 로거 반환."""
    return structlog.get_logger(name)
