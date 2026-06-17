import secrets

import requests


class EmailCredentials:
    def __init__(self, tenant_id: str, client_id: str, client_secret: str, sender: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.sender = sender


class EmailService:
    def __init__(self, credentials: EmailCredentials):
        self.credentials = credentials
        self._access_token = None

    def get_access_token(self) -> str:
        token_url = f"https://login.microsoftonline.com/{self.credentials.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.credentials.client_id,
            "client_secret": self.credentials.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }
        resp = requests.post(token_url, data=data)
        resp.raise_for_status()
        self._access_token = resp.json()["access_token"]
        return self._access_token

    def send_email(self, recipient: str, subject: str, content: str, content_type: str = "Text") -> bool:
        try:
            if not self._access_token:
                self.get_access_token()

            url = f"https://graph.microsoft.com/v1.0/users/{self.credentials.sender}/sendMail"

            email_msg = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": content_type,
                        "content": content,
                    },
                    "toRecipients": [{"emailAddress": {"address": recipient}}],
                },
                "saveToSentItems": "true",
            }

            headers = {
                "Authorization": f"Bearer {self._access_token}",
                "Content-Type": "application/json",
            }

            resp = requests.post(url, headers=headers, json=email_msg)
            resp.raise_for_status()
            return True
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False

    def send_verification_email(self, recipient: str, verification_token: str, frontend_base_url: str) -> bool:
        verification_url = f"{frontend_base_url}/api/verify-email?token={verification_token}"
        print(f"Email verification link - {verification_url}")

        subject = "Verify Your Email Address"
        content = f"""
Hello,

Thank you for registering with PaperBee. Please click the link below to verify your email address:

{verification_url}

If you did not create an account, please ignore this email.

Best regards,
PaperBee Team
        """.strip()

        return self.send_email(recipient, subject, content)

    def send_password_reset_email(self, recipient: str, new_password: str) -> bool:
        subject = "Your New Password - PaperBee"
        content = f"""
Hello,

Your password has been reset as requested. Your new password is:

{new_password}

Please use this password to log in to your account. We recommend changing this password after logging in for security purposes.

If you did not request this password reset, please contact support immediately.

Best regards,
PaperBee Team
        """.strip()

        return self.send_email(recipient, subject, content)

    @staticmethod
    def generate_verification_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_random_password(length: int = 12) -> str:
        return secrets.token_urlsafe(length)[:length]
