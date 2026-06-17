class BaseStatusClass:
    @classmethod
    def vars_to_dict(cls) -> dict:
        valid_vars = {
            var: value
            for var, value in cls.__dict__.items()
            if not callable(getattr(cls, var)) and not var.startswith("__")
        }
        return valid_vars

    @classmethod
    def get_tuples_for_choices(cls) -> list:
        return [
            (value, value)
            for var, value in cls.__dict__.items()
            if not callable(getattr(cls, var)) and not var.startswith("__")
        ]

    @classmethod
    def get_list_for_choices(cls) -> list:
        return [
            value for var, value in cls.__dict__.items() if not callable(getattr(cls, var)) and not var.startswith("__")
        ]
