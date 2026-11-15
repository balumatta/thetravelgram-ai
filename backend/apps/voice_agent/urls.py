from fastapi import APIRouter
from apps.voice_agent.views import VoiceAgentView

api_router = APIRouter()
view = VoiceAgentView()

api_router.add_api_route("/api/voice-agent/session", view.get_session, methods=["GET"])
api_router.add_api_route("/api/voice-agent/session/new", view.new_session, methods=["POST"])
api_router.add_api_route("/api/voice-agent/message", view.send_message, methods=["POST"])
api_router.add_api_route("/api/voice-agent/session/regenerate", view.regenerate_blog, methods=["POST"])
api_router.add_api_route("/api/voice-agent/blog", view.get_blog, methods=["GET"])
api_router.add_api_route("/api/voice-agent/blog", view.update_blog, methods=["PUT"])
api_router.add_api_route("/api/voice-agent/blog", view.delete_blog, methods=["DELETE"])
api_router.add_api_route("/api/voice-agent/blog/reformat", view.reformat_blog, methods=["POST"])
api_router.add_api_route("/api/media/upload", view.upload_media, methods=["POST"])
