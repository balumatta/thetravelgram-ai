"""
Custom exceptions for LLM API errors with improved detection based on exception types and status codes
"""

import logging

logger = logging.getLogger(__name__)


class QuotaExceededException(Exception):
    """
    Raised when API quota is exceeded and cannot be resolved by retrying.
    This indicates a billing/quota issue that requires manual intervention.
    """

    def __init__(
        self,
        message="API quota exceeded. Please check your plan and billing details.",
        provider=None,
        original_error=None,
    ):
        self.provider = provider
        self.original_error = original_error
        super().__init__(message)


class CriticalAPIException(Exception):
    """
    Raised for unrecoverable API errors that shouldn't be retried.
    This includes authentication errors, invalid API keys, etc.
    """

    def __init__(self, message="Critical API error occurred", provider=None, original_error=None):
        self.provider = provider
        self.original_error = original_error
        super().__init__(message)
