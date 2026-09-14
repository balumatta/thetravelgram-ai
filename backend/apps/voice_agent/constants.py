from enum import Enum


class SessionState(Enum):
    OVERVIEW = "overview"
    DAY = "day"
    WRAPUP = "wrapup"
    GENERATE = "generate"
    DONE = "done"
