class UserServiceError(Exception):
    pass


class UserAlreadyExistsError(UserServiceError):
    pass


class UserNotFoundError(UserServiceError):
    pass


class InvalidCredentialsError(UserServiceError):
    pass


class InactiveUserError(UserServiceError):
    pass
