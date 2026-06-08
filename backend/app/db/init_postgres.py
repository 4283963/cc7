from .postgres import Base, engine
from . import container  # noqa: F401


def init_postgres():
    Base.metadata.create_all(bind=engine)
    print("PostgreSQL tables initialized.")


if __name__ == "__main__":
    init_postgres()
