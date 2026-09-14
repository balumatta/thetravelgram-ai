from fastapi import APIRouter
from apps.voice_agent.views import VoiceAgentView

api_router = APIRouter()
view = VoiceAgentView()

api_router.add_api_route("/api/voice-agent/session", view.get_session, methods=["GET"])
api_router.add_api_route("/api/voice-agent/session/new", view.new_session, methods=["POST"])
api_router.add_api_route("/api/voice-agent/message", view.send_message, methods=["POST"])
