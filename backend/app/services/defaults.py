DEFAULT_CATEGORIES: tuple[tuple[str, str, str], ...] = (
    ("Salario", "income", "#22c55e"),
    ("Freelance", "income", "#10b981"),
    ("Inversiones", "income", "#14b8a6"),
    ("Otros ingresos", "income", "#84cc16"),
    ("Vivienda", "expense", "#ef4444"),
    ("Supermercado", "expense", "#f97316"),
    ("Transporte", "expense", "#eab308"),
    ("Restaurantes", "expense", "#ec4899"),
    ("Ocio", "expense", "#a855f7"),
    ("Salud", "expense", "#06b6d4"),
    ("Educación", "expense", "#3b82f6"),
    ("Suscripciones", "expense", "#8b5cf6"),
)


def seed_default_categories(user_id) -> list:
    from ..models import Category, TransactionKind

    return [
        Category(user_id=user_id, name=name, kind=TransactionKind(kind), color=color)
        for name, kind, color in DEFAULT_CATEGORIES
    ]
