import sqlite3
import pathlib
import datetime

DB = pathlib.Path(__file__).parent / "dealmind.db"


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c


def now():
    return datetime.datetime.utcnow().isoformat()


def _column_exists(c, table_name, column_name):
    rows = c.execute(
        f"PRAGMA table_info({table_name})"
    ).fetchall()

    return any(
        row["name"] == column_name
        for row in rows
    )


def _create_default_pipeline(c, org_id):
    """
    Create the default sales pipeline for an organization
    if one does not already exist.

    Existing organizations are migrated automatically.
    """

    pipeline = c.execute(
        """
        SELECT id
        FROM pipelines
        WHERE org_id=?
        ORDER BY id
        LIMIT 1
        """,
        (org_id,),
    ).fetchone()

    if pipeline:
        return pipeline["id"]

    pipeline_id = c.execute(
        """
        INSERT INTO pipelines(
            org_id,
            name,
            created_at
        )
        VALUES(?,?,?)
        """,
        (
            org_id,
            "Default Sales Pipeline",
            now(),
        ),
    ).lastrowid

    default_stages = [
        ("Discovery", 1, 0, 0),
        ("Demo", 2, 0, 0),
        ("Proposal", 3, 0, 0),
        ("Negotiation", 4, 0, 0),
        ("Closed Won", 5, 1, 0),
        ("Closed Lost", 6, 0, 1),
    ]

    for name, position, is_won, is_lost in default_stages:
        c.execute(
            """
            INSERT INTO pipeline_stages(
                pipeline_id,
                name,
                position,
                is_won,
                is_lost,
                created_at
            )
            VALUES(?,?,?,?,?,?)
            """,
            (
                pipeline_id,
                name,
                position,
                is_won,
                is_lost,
                now(),
            ),
        )

    return pipeline_id


def _migrate_existing_deals(c):
    """
    Add pipeline_id to existing deals and connect them
    to each organization's default pipeline.

    Existing stage values are preserved.
    """

    if not _column_exists(c, "deals", "pipeline_id"):
        c.execute(
            """
            ALTER TABLE deals
            ADD COLUMN pipeline_id INTEGER
            """
        )

    orgs = c.execute(
        """
        SELECT id
        FROM orgs
        ORDER BY id
        """
    ).fetchall()

    for org in orgs:
        org_id = org["id"]

        pipeline_id = _create_default_pipeline(
            c,
            org_id,
        )

        # Make sure any old/custom stage names that already
        # exist in the database also exist in the pipeline.
        existing_stages = c.execute(
            """
            SELECT DISTINCT stage
            FROM deals
            WHERE org_id=?
              AND stage IS NOT NULL
              AND TRIM(stage) <> ''
            """,
            (org_id,),
        ).fetchall()

        for row in existing_stages:
            stage_name = row["stage"].strip()

            exists = c.execute(
                """
                SELECT 1
                FROM pipeline_stages
                WHERE pipeline_id=?
                  AND name=?
                """,
                (
                    pipeline_id,
                    stage_name,
                ),
            ).fetchone()

            if exists:
                continue

            max_position = c.execute(
                """
                SELECT COALESCE(MAX(position), 0) AS max_position
                FROM pipeline_stages
                WHERE pipeline_id=?
                """,
                (pipeline_id,),
            ).fetchone()["max_position"]

            lower_name = stage_name.lower()

            is_won = 1 if lower_name in (
                "closed won",
                "won",
                "closed",
            ) else 0

            is_lost = 1 if lower_name in (
                "closed lost",
                "lost",
            ) else 0

            c.execute(
                """
                INSERT INTO pipeline_stages(
                    pipeline_id,
                    name,
                    position,
                    is_won,
                    is_lost,
                    created_at
                )
                VALUES(?,?,?,?,?,?)
                """,
                (
                    pipeline_id,
                    stage_name,
                    max_position + 1,
                    is_won,
                    is_lost,
                    now(),
                ),
            )

        # Connect deals that don't have a pipeline.
        c.execute(
            """
            UPDATE deals
            SET pipeline_id=?
            WHERE org_id=?
              AND pipeline_id IS NULL
            """,
            (
                pipeline_id,
                org_id,
            ),
        )


def init():
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS orgs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                org_id INTEGER NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS customers(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                org_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                industry TEXT,
                website TEXT,
                notes TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS pipelines(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                org_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS pipeline_stages(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                is_won INTEGER NOT NULL DEFAULT 0,
                is_lost INTEGER NOT NULL DEFAULT 0,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS deals(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                org_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                value TEXT,
                stage TEXT,
                product TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS interactions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deal_id INTEGER NOT NULL,
                date TEXT,
                type TEXT,
                title TEXT,
                notes TEXT,
                outcome TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS history(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deal_id INTEGER NOT NULL,
                question TEXT,
                answer TEXT,
                n_interactions INTEGER,
                n_memories INTEGER,
                created_at TEXT
            );
            """
        )

        # Add the new pipeline_id column to old databases.
        _migrate_existing_deals(c)

        # Create a default pipeline for every organization.
        orgs = c.execute(
            """
            SELECT id
            FROM orgs
            ORDER BY id
            """
        ).fetchall()

        for org in orgs:
            _create_default_pipeline(
                c,
                org["id"],
            )