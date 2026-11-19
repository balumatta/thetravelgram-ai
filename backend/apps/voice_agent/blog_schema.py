"""
Flat-block schema for structured travel blog generation.
Each section is one typed block; the blog is an ordered list of these blocks.
"""

STRUCTURED_BLOG_TOOL = {
    "name": "create_structured_blog",
    "description": (
        "Create a fully structured travel blog. "
        "Output a flat ordered list of typed blocks. "
        "Consecutive dialogue/conversation lines from the SAME exchange MUST be in ONE conversation block."
    ),
    "input_schema": {
        "type": "object",
        "required": ["title", "subtitle", "sections"],
        "properties": {
            "title": {
                "type": "string",
                "description": "Catchy specific title e.g. 'The NZ Chronicles' or 'Seychelles Saga'"
            },
            "subtitle": {
                "type": "string",
                "description": "Short evocative one-liner e.g. '14 days, one campervan, four idiots'"
            },
            "sections": {
                "type": "array",
                "description": "Ordered list of typed content blocks that make up the full blog",
                "items": {
                    "anyOf": [
                        {
                            "type": "object",
                            "required": ["type", "text"],
                            "properties": {
                                "type": {"type": "string", "enum": ["paragraph"]},
                                "text": {"type": "string", "description": "One narrative paragraph"}
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "lines"],
                            "properties": {
                                "type": {"type": "string", "enum": ["conversation"]},
                                "lines": {
                                    "type": "array",
                                    "description": "All lines of ONE continuous dialogue exchange",
                                    "items": {
                                        "type": "object",
                                        "required": ["speaker", "text"],
                                        "properties": {
                                            "speaker": {
                                                "type": "string",
                                                "description": "First name or role e.g. 'Rinku', 'Me', 'inner-me', 'Cop'"
                                            },
                                            "text": {
                                                "type": "string",
                                                "description": "Exact verbatim quote, no surrounding quotes"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "text"],
                            "properties": {
                                "type": {"type": "string", "enum": ["fact"]},
                                "text": {
                                    "type": "string",
                                    "description": "Interesting standalone fact, observation or aside — 1-3 sentences"
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "title"],
                            "properties": {
                                "type": {"type": "string", "enum": ["day_header"]},
                                "day_number": {
                                    "type": ["integer", "null"],
                                    "description": "Day number e.g. 1, 2, 3 or null for intro"
                                },
                                "date": {
                                    "type": "string",
                                    "description": "Date string if mentioned e.g. '01/03/2026'"
                                },
                                "title": {
                                    "type": "string",
                                    "description": "Day title e.g. 'Christchurch → Fairlie' or 'The Journey Begins'"
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "stops"],
                            "properties": {
                                "type": {"type": "string", "enum": ["itinerary"]},
                                "stops": {
                                    "type": "array",
                                    "description": "Ordered list of place/city names ONLY — no transport details, no descriptions",
                                    "items": {"type": "string"}
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "places"],
                            "properties": {
                                "type": {"type": "string", "enum": ["must_visit"]},
                                "places": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["name", "why", "emoji"],
                                        "properties": {
                                            "name": {"type": "string"},
                                            "why": {
                                                "type": "string",
                                                "description": "ONE sentence max — why it's worth it"
                                            },
                                            "emoji": {"type": "string", "description": "Single emoji"}
                                        }
                                    }
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "items"],
                            "properties": {
                                "type": {"type": "string", "enum": ["tips"]},
                                "items": {
                                    "type": "array",
                                    "description": "Each tip is ONE short punchy sentence — not an essay",
                                    "items": {"type": "string"}
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "people"],
                            "properties": {
                                "type": {"type": "string", "enum": ["thanks"]},
                                "people": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["name", "role"],
                                        "properties": {
                                            "name": {"type": "string"},
                                            "role": {"type": "string", "description": "e.g. 'Wife & co-traveler', 'Local guide'"},
                                            "image_url": {"type": "string", "default": ""}
                                        }
                                    }
                                }
                            }
                        },
                        {
                            "type": "object",
                            "required": ["type", "text"],
                            "properties": {
                                "type": {"type": "string", "enum": ["closing"]},
                                "text": {"type": "string", "description": "The final sign-off paragraph"}
                            }
                        }
                    ]
                }
            }
        }
    }
}
