import os
import json
import re
import pathlib

from datetime import date
from collections import Counter, defaultdict

import httpx

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, field_validator

import db
import demo_data

from auth import (
    make_token,
    hash_password,
    verify_password,
    slugify,
    random_token,
    current_user,
)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv(
    pathlib.Path(__file__).parent.parent / ".env"
)

load_dotenv(
    pathlib.Path(__file__).parent / ".env"
)

MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-120b"
)

db.init()


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(title="DealMind")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:5188",
        "https://dealmind-three.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# LOW-LEVEL HELPERS
# ============================================================

def bank_id(org_id: int) -> str:
    return f"org-{org_id}"


def hs():
    api_key = os.getenv("HINDSIGHT_API_KEY")

    if not api_key:
        raise HTTPException(
            503,
            "HINDSIGHT_API_KEY missing in .env"
        )

    from hindsight_client import Hindsight

    return Hindsight(
        base_url=os.getenv(
            "HINDSIGHT_BASE_URL",
            "https://api.hindsight.vectorize.io"
        ),
        api_key=api_key,
    )


def ensure_bank(org_id: int):
    api_key = os.getenv("HINDSIGHT_API_KEY")

    if not api_key:
        raise HTTPException(
            503,
            "HINDSIGHT_API_KEY missing in .env"
        )

    base_url = os.getenv(
        "HINDSIGHT_BASE_URL",
        "https://api.hindsight.vectorize.io"
    ).rstrip("/")

    bid = bank_id(org_id)

    payload = {
        "name": f"DealMind Workspace {org_id}",
        "mission": (
            "Remember and organize B2B sales customer interactions, "
            "deal context, objections, stakeholders, commitments, "
            "outcomes, and lessons learned so DealMind can provide "
            "better sales recommendations over time."
        ),
    }

    try:
        response = httpx.put(
            f"{base_url}/v1/default/banks/{bid}",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )

        if response.status_code not in (200, 201):
            raise HTTPException(
                502,
                (
                    f"Hindsight bank setup failed "
                    f"({response.status_code}): "
                    f"{response.text[:300]}"
                ),
            )

        return True

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            502,
            f"Hindsight bank setup error: {type(e).__name__}: {e}"
        )


def wrap(fn):
    try:
        return fn()

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            502,
            f"{type(e).__name__}: {e}"
        )


def fmt_interaction(customer, i):
    return (
        f"[{i['date']}] {i['type']} with {customer} - "
        f"{i['title']}. {i['notes']} "
        f"Outcome: {i['outcome']}"
    )


# ============================================================
# HINDSIGHT MEMORY
# ============================================================

def retain(org_id: int, customer: str, i: dict):
    ensure_bank(org_id)

    wrap(
        lambda: hs().retain(
            bank_id=bank_id(org_id),
            content=fmt_interaction(
                customer,
                i
            ),
            context=f"sales {i['type']} with {customer}",
        )
    )


def recall(org_id: int, q: str):
    ensure_bank(org_id)

    r = wrap(
        lambda: hs().recall(
            bank_id=bank_id(org_id),
            query=q,
        )
    )

    return [
        {
            "text": m.text,
            "type": getattr(
                m,
                "type",
                None
            ),
            "date": str(
                getattr(
                    m,
                    "occurred_start",
                    ""
                ) or ""
            ),
        }
        for m in r.results
    ]


# ============================================================
# GROQ LLM
# ============================================================

def llm(system, user, js=False):

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            503,
            "GROQ_API_KEY missing in .env"
        )

    body = {
        "model": MODEL,
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": user,
            },
        ],
    }

    if js:
        body["response_format"] = {
            "type": "json_object"
        }

    r = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=body,
        timeout=60,
        headers={
            "Authorization":
                f"Bearer {os.getenv('GROQ_API_KEY')}"
        },
    )

    if r.status_code != 200:
        raise HTTPException(
            502,
            f"Groq error {r.status_code}: {r.text[:200]}"
        )

    return r.json()["choices"][0]["message"]["content"]


# ============================================================
# STRICT DEALMIND SYSTEM PROMPT
# ============================================================

def sys_prompt(deal):

    return f"""
You are DealMind, an AI sales intelligence agent analyzing one specific sales deal.

Deal:

- Customer: {deal['customer']}
- Product: {deal['product'] or 'Not available'}
- Deal value: {deal['value'] or 'Not available'}
- Stage: {deal['stage'] or 'Not available'}

STRICT EVIDENCE RULES:

1. Use ONLY facts explicitly present in the supplied deal data and recalled customer memories.

2. NEVER invent or assume:
   - people or job titles
   - budgets
   - prices
   - dates
   - competitors
   - objections
   - requirements
   - commitments
   - timelines
   - outcomes
   - metrics
   - ROI
   - customer priorities
   - approval status

3. If a fact is not explicitly available, say:

   "Not available in the recorded customer history."

4. Do not convert a recommendation into a customer fact.

5. Clearly distinguish:
   - Confirmed facts
   - Evidence-based interpretation
   - Recommended next actions

6. If there is not enough evidence to answer the question about this specific deal,
   say so instead of giving generic sales advice.

7. Do not use typical B2B sales patterns as if they were facts about this customer.

8. Do not mention information from another customer or another deal.

Be concise, specific, and useful.
"""


# ============================================================
# AI ANSWER
# ============================================================

def answer(deal, org_id, q, memory=True):

    retrieval_query = (
        f"Customer: {deal['customer']}\n"
        f"Deal: {deal.get('product') or 'Unknown product'}\n"
        f"Stage: {deal.get('stage') or 'Unknown stage'}\n"
        f"Question: {q}"
    )

    if not memory:

        return (
            f"I don't have enough customer history to answer this "
            f"specifically for {deal['customer']}.\n\n"
            f"Known deal information:\n"
            f"- Customer: {deal['customer']}\n"
            f"- Product: {deal.get('product') or 'Not available'}\n"
            f"- Deal value: {deal.get('value') or 'Not available'}\n"
            f"- Stage: {deal.get('stage') or 'Not available'}\n\n"
            f"No customer interaction history is being used for this "
            f"analysis, so I won't guess whether the blocker is pricing, "
            f"budget, competition, legal, ROI, or another issue.\n\n"
            f"DealMind needs recorded customer interactions to provide "
            f"a customer-specific answer."
        ), []

    mem = recall(
        org_id,
        retrieval_query
    )

    if not mem:

        return (
            f"I don't have enough recorded customer history to answer "
            f"this specifically for {deal['customer']}.\n\n"
            f"Known deal information:\n"
            f"- Customer: {deal['customer']}\n"
            f"- Product: {deal.get('product') or 'Not available'}\n"
            f"- Deal value: {deal.get('value') or 'Not available'}\n"
            f"- Stage: {deal.get('stage') or 'Not available'}\n\n"
            f"No relevant customer memories were found for this question. "
            f"I won't guess the reason for the deal situation.\n\n"
            f"Add the latest customer interaction, objection, meeting "
            f"outcome, or follow-up and ask again."
        ), []

    ctx = "\n".join(
        f"[Memory {idx + 1}] {m['text']}"
        for idx, m in enumerate(mem)
    )

    user_prompt = f"""
Analyze the following sales question using ONLY the supplied deal
information and recalled customer memories.

DEAL

Customer: {deal['customer']}
Product: {deal.get('product') or 'Not available'}
Value: {deal.get('value') or 'Not available'}
Stage: {deal.get('stage') or 'Not available'}

RECALLED CUSTOMER MEMORIES

{ctx}

QUESTION

{q}

RESPONSE RULES

- Use only the supplied information.
- Do not invent missing facts.
- Do not assume typical sales problems apply to this customer.
- If something is unknown, explicitly say:

  "Not available in the recorded customer history."

- Separate confirmed facts from interpretation and recommendations.
- Recommendations are allowed, but label them as recommendations.
- If the memories do not contain enough evidence to answer the question,
  say that clearly.

Structure the answer as:

## What the history confirms

Only facts supported by the memories.

## What this suggests

Only reasonable interpretations directly supported by those facts.

## Recommended next step

A practical recommendation based on the available evidence.

Keep the answer concise.
"""

    result = llm(
        sys_prompt(deal),
        user_prompt
    )

    return result, mem


# ============================================================
# DB LOOKUPS
# ============================================================

def get_customer(customer_id: int, org_id: int):

    with db.conn() as c:

        row = c.execute(
            """
            SELECT *
            FROM customers
            WHERE id=? AND org_id=?
            """,
            (
                customer_id,
                org_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(
            404,
            "Customer not found"
        )

    return dict(row)


def get_deal(deal_id: int, org_id: int):

    with db.conn() as c:

        row = c.execute(
            """
            SELECT
                d.*,
                cu.name AS customer,
                p.name AS pipeline_name,
                ps.name AS stage_name,
                ps.position AS stage_position,
                ps.is_won AS stage_is_won,
                ps.is_lost AS stage_is_lost
            FROM deals d
            JOIN customers cu
                ON cu.id=d.customer_id
            LEFT JOIN pipelines p
                ON p.id=d.pipeline_id
            LEFT JOIN pipeline_stages ps
                ON ps.pipeline_id=d.pipeline_id
               AND ps.name=d.stage
            WHERE d.id=?
              AND d.org_id=?
            """,
            (
                deal_id,
                org_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(
            404,
            "Deal not found"
        )

    return dict(row)


# ============================================================
# SCHEMAS
# ============================================================

EMAIL_RE = re.compile(
    r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
)


def _valid_email(v: str) -> str:

    v = v.strip().lower()

    if not EMAIL_RE.match(v):
        raise ValueError(
            "Enter a valid email address."
        )

    return v


def _valid_pw(v: str) -> str:

    if len(v) < 8:
        raise ValueError(
            "Password must be at least 8 characters."
        )

    return v


class Signup(BaseModel):

    org_name: str
    name: str
    email: str
    password: str

    _e = field_validator("email")(
        _valid_email
    )

    _p = field_validator("password")(
        _valid_pw
    )


class Join(BaseModel):

    org_slug: str
    name: str
    email: str
    password: str

    _e = field_validator("email")(
        _valid_email
    )

    _p = field_validator("password")(
        _valid_pw
    )


class Login(BaseModel):

    email: str
    password: str

    _e = field_validator("email")(
        _valid_email
    )


class CustomerIn(BaseModel):

    name: str
    industry: str = ""
    website: str = ""
    notes: str = ""


class DealIn(BaseModel):

    value: str = ""
    stage: str = ""
    product: str = ""
    pipeline_id: int | None = None


class Interaction(BaseModel):

    date: str = ""
    type: str
    title: str
    notes: str
    outcome: str


class Q(BaseModel):

    question: str


class PipelineIn(BaseModel):

    name: str


class StageIn(BaseModel):

    name: str
    is_won: bool = False
    is_lost: bool = False


class StageUpdate(BaseModel):

    name: str
    is_won: bool = False
    is_lost: bool = False


class StageReorder(BaseModel):

    ordered_ids: list[int]


class DealStageUpdate(BaseModel):

    stage: str


# ============================================================
# PIPELINE HELPERS
# ============================================================

def get_pipeline(
    pipeline_id: int,
    org_id: int
):

    with db.conn() as c:

        row = c.execute(
            """
            SELECT *
            FROM pipelines
            WHERE id=? AND org_id=?
            """,
            (
                pipeline_id,
                org_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(
            404,
            "Pipeline not found"
        )

    return dict(row)


def get_default_pipeline(org_id: int):

    with db.conn() as c:

        row = c.execute(
            """
            SELECT *
            FROM pipelines
            WHERE org_id=?
            ORDER BY id
            LIMIT 1
            """,
            (org_id,),
        ).fetchone()

    if not row:
        raise HTTPException(
            404,
            "No sales pipeline exists for this workspace."
        )

    return dict(row)


def get_stage(
    stage_id: int,
    org_id: int
):

    with db.conn() as c:

        row = c.execute(
            """
            SELECT
                ps.*,
                p.org_id,
                p.name AS pipeline_name
            FROM pipeline_stages ps
            JOIN pipelines p
                ON p.id=ps.pipeline_id
            WHERE ps.id=?
              AND p.org_id=?
            """,
            (
                stage_id,
                org_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(
            404,
            "Pipeline stage not found"
        )

    return dict(row)


def normalize_stage_name(name: str):

    name = name.strip()

    if not name:
        raise HTTPException(
            400,
            "Stage name cannot be empty."
        )

    if len(name) > 60:
        raise HTTPException(
            400,
            "Stage name must be 60 characters or less."
        )

    return name


# ============================================================
# AUTH
# ============================================================

@app.post("/api/auth/signup")
def signup(body: Signup):

    with db.conn() as c:

        if c.execute(
            "SELECT 1 FROM users WHERE email=?",
            (body.email,),
        ).fetchone():

            raise HTTPException(
                400,
                "An account with that email already exists."
            )

        slug = slugify(body.org_name)
        base = slug
        n = 1

        while c.execute(
            "SELECT 1 FROM orgs WHERE slug=?",
            (slug,),
        ).fetchone():

            n += 1
            slug = f"{base}-{n}"

        org_id = c.execute(
            """
            INSERT INTO orgs(
                name,
                slug,
                created_at
            )
            VALUES(?,?,?)
            """,
            (
                body.org_name,
                slug,
                db.now(),
            ),
        ).lastrowid

        uid = c.execute(
            """
            INSERT INTO users(
                org_id,
                email,
                name,
                password_hash,
                created_at
            )
            VALUES(?,?,?,?,?)
            """,
            (
                org_id,
                body.email,
                body.name,
                hash_password(body.password),
                db.now(),
            ),
        ).lastrowid

        # Create the first pipeline immediately.
        # db.init() already contains the migration logic.
        c.execute(
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
                db.now(),
            ),
        )

        pipeline_id = c.lastrowid

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
                    db.now(),
                ),
            )

    try:
        ensure_bank(org_id)

    except HTTPException as e:
        print(
            f"[DealMind] Hindsight bank setup warning "
            f"for org-{org_id}: {e.detail}"
        )

    token = make_token(
        {
            "uid": uid,
            "org_id": org_id,
            "email": body.email,
        }
    )

    return {
        "token": token,
        "org": {
            "id": org_id,
            "name": body.org_name,
            "slug": slug,
        },
        "user": {
            "id": uid,
            "name": body.name,
            "email": body.email,
        },
    }


@app.post("/api/auth/join")
def join(body: Join):

    with db.conn() as c:

        org = c.execute(
            """
            SELECT *
            FROM orgs
            WHERE slug=?
            """,
            (
                body.org_slug.strip().lower(),
            ),
        ).fetchone()

        if not org:
            raise HTTPException(
                404,
                "No workspace found with that ID. "
                "Ask a teammate for the exact workspace ID."
            )

        if c.execute(
            "SELECT 1 FROM users WHERE email=?",
            (body.email,),
        ).fetchone():

            raise HTTPException(
                400,
                "An account with that email already exists."
            )

        uid = c.execute(
            """
            INSERT INTO users(
                org_id,
                email,
                name,
                password_hash,
                created_at
            )
            VALUES(?,?,?,?,?)
            """,
            (
                org["id"],
                body.email,
                body.name,
                hash_password(body.password),
                db.now(),
            ),
        ).lastrowid

    try:
        ensure_bank(org["id"])

    except HTTPException as e:
        print(
            f"[DealMind] Hindsight bank setup warning "
            f"for org-{org['id']}: {e.detail}"
        )

    token = make_token(
        {
            "uid": uid,
            "org_id": org["id"],
            "email": body.email,
        }
    )

    return {
        "token": token,
        "org": {
            "id": org["id"],
            "name": org["name"],
            "slug": org["slug"],
        },
        "user": {
            "id": uid,
            "name": body.name,
            "email": body.email,
        },
    }


@app.post("/api/auth/login")
def login(body: Login):

    with db.conn() as c:

        u = c.execute(
            """
            SELECT *
            FROM users
            WHERE email=?
            """,
            (body.email,),
        ).fetchone()

        if not u or not verify_password(
            body.password,
            u["password_hash"],
        ):

            raise HTTPException(
                401,
                "Incorrect email or password."
            )

        org = c.execute(
            """
            SELECT *
            FROM orgs
            WHERE id=?
            """,
            (u["org_id"],),
        ).fetchone()

    try:
        ensure_bank(u["org_id"])

    except HTTPException as e:
        print(
            f"[DealMind] Hindsight bank setup warning "
            f"for org-{u['org_id']}: {e.detail}"
        )

    token = make_token(
        {
            "uid": u["id"],
            "org_id": u["org_id"],
            "email": u["email"],
        }
    )

    return {
        "token": token,
        "org": {
            "id": org["id"],
            "name": org["name"],
            "slug": org["slug"],
        },
        "user": {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
        },
    }


@app.get("/api/me")
def me(user=Depends(current_user)):

    with db.conn() as c:

        org = c.execute(
            """
            SELECT *
            FROM orgs
            WHERE id=?
            """,
            (user["org_id"],),
        ).fetchone()

        u = c.execute(
            """
            SELECT *
            FROM users
            WHERE id=? AND org_id=?
            """,
            (
                user["uid"],
                user["org_id"],
            ),
        ).fetchone()

    return {
        "org": {
            "id": org["id"],
            "name": org["name"],
            "slug": org["slug"],
        },
        "user": {
            "id": user["uid"],
            "name": u["name"] if u else "",
            "email": user["email"],
        },
        "hindsight": bool(
            os.getenv("HINDSIGHT_API_KEY")
        ),
        "groq": bool(
            os.getenv("GROQ_API_KEY")
        ),
    }


# ============================================================
# DEMO MODE
# ============================================================

@app.post("/api/demo/instant")
def demo_instant():

    suffix = random_token(6)

    org_name = f"Demo Team {suffix}"
    slug = f"demo-{suffix}"
    email = f"guest-{suffix}@demo.dealmind.local"

    with db.conn() as c:

        org_id = c.execute(
            """
            INSERT INTO orgs(
                name,
                slug,
                created_at
            )
            VALUES(?,?,?)
            """,
            (
                org_name,
                slug,
                db.now(),
            ),
        ).lastrowid

        uid = c.execute(
            """
            INSERT INTO users(
                org_id,
                email,
                name,
                password_hash,
                created_at
            )
            VALUES(?,?,?,?,?)
            """,
            (
                org_id,
                email,
                "Guest",
                hash_password(
                    random_token(16)
                ),
                db.now(),
            ),
        ).lastrowid

        # Demo workspace pipeline
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
                db.now(),
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
                    db.now(),
                ),
            )

        cust_id = c.execute(
            """
            INSERT INTO customers(
                org_id,
                name,
                industry,
                website,
                notes,
                created_at
            )
            VALUES(?,?,?,?,?,?)
            """,
            (
                org_id,
                "Acme Technologies",
                "Fintech",
                "acme-technologies.example",
                "Seeded automatically by Demo Mode.",
                db.now(),
            ),
        ).lastrowid

        deal_id = c.execute(
            """
            INSERT INTO deals(
                org_id,
                customer_id,
                pipeline_id,
                value,
                stage,
                product,
                created_at
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                org_id,
                cust_id,
                pipeline_id,
                "$240,000",
                "Negotiation",
                "DealFlow Platform",
                db.now(),
            ),
        ).lastrowid

        warning = None

        for item in demo_data.DEMO_INTERACTIONS:

            i = demo_data.render(
                item,
                "Acme Technologies"
            )

            try:
                retain(
                    org_id,
                    "Acme Technologies",
                    i,
                )

            except HTTPException as e:

                warning = (
                    "Interactions were saved, but "
                    "memory wasn't recorded "
                    f"({e.detail})."
                )

            c.execute(
                """
                INSERT INTO interactions(
                    deal_id,
                    date,
                    type,
                    title,
                    notes,
                    outcome,
                    created_at
                )
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    deal_id,
                    i["date"],
                    i["type"],
                    i["title"],
                    i["notes"],
                    i["outcome"],
                    db.now(),
                ),
            )

    token = make_token(
        {
            "uid": uid,
            "org_id": org_id,
            "email": email,
        }
    )

    return {
        "token": token,
        "org": {
            "id": org_id,
            "name": org_name,
            "slug": slug,
        },
        "user": {
            "id": uid,
            "name": "Guest",
            "email": email,
        },
        "customer_id": cust_id,
        "deal_id": deal_id,
        "warning": warning,
    }


# ============================================================
# CUSTOMERS
# ============================================================

@app.get("/api/customers")
def list_customers(
    user=Depends(current_user)
):

    with db.conn() as c:

        rows = c.execute(
            """
            SELECT
                cu.*,
                (
                    SELECT COUNT(*)
                    FROM deals d
                    WHERE d.customer_id=cu.id
                ) AS n_deals
            FROM customers cu
            WHERE org_id=?
            ORDER BY cu.id DESC
            """,
            (
                user["org_id"],
            ),
        ).fetchall()

    return [
        dict(r)
        for r in rows
    ]


@app.post("/api/customers")
def create_customer(
    body: CustomerIn,
    user=Depends(current_user),
):

    with db.conn() as c:

        cid = c.execute(
            """
            INSERT INTO customers(
                org_id,
                name,
                industry,
                website,
                notes,
                created_at
            )
            VALUES(?,?,?,?,?,?)
            """,
            (
                user["org_id"],
                body.name,
                body.industry,
                body.website,
                body.notes,
                db.now(),
            ),
        ).lastrowid

    return get_customer(
        cid,
        user["org_id"]
    )


@app.get("/api/customers/{customer_id}")
def customer_detail(
    customer_id: int,
    user=Depends(current_user),
):

    cust = get_customer(
        customer_id,
        user["org_id"]
    )

    with db.conn() as c:

        deals = [
            dict(r)
            for r in c.execute(
                """
                SELECT
                    d.*,
                    (
                        SELECT COUNT(*)
                        FROM interactions i
                        WHERE i.deal_id=d.id
                    ) AS n
                FROM deals d
                WHERE customer_id=?
                ORDER BY d.id DESC
                """,
                (
                    customer_id,
                ),
            ).fetchall()
        ]

    return {
        "customer": cust,
        "deals": deals,
    }


@app.delete("/api/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    user=Depends(current_user),
):

    get_customer(
        customer_id,
        user["org_id"]
    )

    with db.conn() as c:

        deal_ids = [
            r["id"]
            for r in c.execute(
                """
                SELECT id
                FROM deals
                WHERE customer_id=?
                """,
                (customer_id,),
            ).fetchall()
        ]

        for did in deal_ids:

            c.execute(
                """
                DELETE FROM interactions
                WHERE deal_id=?
                """,
                (did,),
            )

            c.execute(
                """
                DELETE FROM history
                WHERE deal_id=?
                """,
                (did,),
            )

        c.execute(
            """
            DELETE FROM deals
            WHERE customer_id=?
            """,
            (customer_id,),
        )

        c.execute(
            """
            DELETE FROM customers
            WHERE id=?
            """,
            (customer_id,),
        )

    return {
        "ok": True
    }


# ============================================================
# PIPELINES
# ============================================================

@app.get("/api/pipelines")
def list_pipelines(
    user=Depends(current_user)
):

    with db.conn() as c:

        pipelines = c.execute(
            """
            SELECT *
            FROM pipelines
            WHERE org_id=?
            ORDER BY id
            """,
            (
                user["org_id"],
            ),
        ).fetchall()

        result = []

        for pipeline in pipelines:

            stages = c.execute(
                """
                SELECT
                    id,
                    pipeline_id,
                    name,
                    position,
                    is_won,
                    is_lost
                FROM pipeline_stages
                WHERE pipeline_id=?
                ORDER BY position, id
                """,
                (
                    pipeline["id"],
                ),
            ).fetchall()

            item = dict(pipeline)

            item["stages"] = [
                dict(stage)
                for stage in stages
            ]

            result.append(item)

    return result


@app.post("/api/pipelines")
def create_pipeline(
    body: PipelineIn,
    user=Depends(current_user)
):

    name = body.name.strip()

    if not name:
        raise HTTPException(
            400,
            "Pipeline name cannot be empty."
        )

    if len(name) > 80:
        raise HTTPException(
            400,
            "Pipeline name must be 80 characters or less."
        )

    with db.conn() as c:

        existing = c.execute(
            """
            SELECT 1
            FROM pipelines
            WHERE org_id=? AND lower(name)=lower(?)
            """,
            (
                user["org_id"],
                name,
            ),
        ).fetchone()

        if existing:
            raise HTTPException(
                400,
                "A pipeline with that name already exists."
            )

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
                user["org_id"],
                name,
                db.now(),
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

        for stage_name, position, is_won, is_lost in default_stages:

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
                    position,
                    is_won,
                    is_lost,
                    db.now(),
                ),
            )

    return {
        "id": pipeline_id,
        "name": name,
    }


@app.post("/api/pipelines/{pipeline_id}/stages")
def create_stage(
    pipeline_id: int,
    body: StageIn,
    user=Depends(current_user)
):

    pipeline = get_pipeline(
        pipeline_id,
        user["org_id"]
    )

    name = normalize_stage_name(
        body.name
    )

    with db.conn() as c:

        exists = c.execute(
            """
            SELECT 1
            FROM pipeline_stages
            WHERE pipeline_id=?
              AND lower(name)=lower(?)
            """,
            (
                pipeline_id,
                name,
            ),
        ).fetchone()

        if exists:
            raise HTTPException(
                400,
                "A stage with that name already exists."
            )

        max_position = c.execute(
            """
            SELECT COALESCE(MAX(position), 0) AS max_position
            FROM pipeline_stages
            WHERE pipeline_id=?
            """,
            (pipeline_id,),
        ).fetchone()["max_position"]

        stage_id = c.execute(
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
                max_position + 1,
                int(body.is_won),
                int(body.is_lost),
                db.now(),
            ),
        ).lastrowid

    return get_stage(
        stage_id,
        user["org_id"]
    )


@app.put("/api/pipeline-stages/{stage_id}")
def update_stage(
    stage_id: int,
    body: StageUpdate,
    user=Depends(current_user)
):

    stage = get_stage(
        stage_id,
        user["org_id"]
    )

    name = normalize_stage_name(
        body.name
    )

    with db.conn() as c:

        exists = c.execute(
            """
            SELECT 1
            FROM pipeline_stages
            WHERE pipeline_id=?
              AND lower(name)=lower(?)
              AND id<>?
            """,
            (
                stage["pipeline_id"],
                name,
                stage_id,
            ),
        ).fetchone()

        if exists:
            raise HTTPException(
                400,
                "A stage with that name already exists."
            )

        old_name = stage["name"]

        c.execute(
            """
            UPDATE pipeline_stages
            SET
                name=?,
                is_won=?,
                is_lost=?
            WHERE id=?
            """,
            (
                name,
                int(body.is_won),
                int(body.is_lost),
                stage_id,
            ),
        )

        # Keep deals synchronized if the stage name changes.
        if old_name != name:

            c.execute(
                """
                UPDATE deals
                SET stage=?
                WHERE pipeline_id=?
                  AND stage=?
                  AND org_id=?
                """,
                (
                    name,
                    stage["pipeline_id"],
                    old_name,
                    user["org_id"],
                ),
            )

    return get_stage(
        stage_id,
        user["org_id"]
    )


@app.delete("/api/pipeline-stages/{stage_id}")
def delete_stage(
    stage_id: int,
    user=Depends(current_user)
):

    stage = get_stage(
        stage_id,
        user["org_id"]
    )

    with db.conn() as c:

        deal_count = c.execute(
            """
            SELECT COUNT(*) AS n
            FROM deals
            WHERE pipeline_id=?
              AND stage=?
              AND org_id=?
            """,
            (
                stage["pipeline_id"],
                stage["name"],
                user["org_id"],
            ),
        ).fetchone()["n"]

        if deal_count > 0:

            raise HTTPException(
                400,
                (
                    f"This stage has {deal_count} deal(s). "
                    "Move those deals to another stage before deleting it."
                )
            )

        stage_count = c.execute(
            """
            SELECT COUNT(*) AS n
            FROM pipeline_stages
            WHERE pipeline_id=?
            """,
            (
                stage["pipeline_id"],
            ),
        ).fetchone()["n"]

        if stage_count <= 1:

            raise HTTPException(
                400,
                "A pipeline must contain at least one stage."
            )

        c.execute(
            """
            DELETE FROM pipeline_stages
            WHERE id=?
            """,
            (stage_id,),
        )

        remaining = c.execute(
            """
            SELECT id
            FROM pipeline_stages
            WHERE pipeline_id=?
            ORDER BY position, id
            """,
            (
                stage["pipeline_id"],
            ),
        ).fetchall()

        for index, row in enumerate(remaining, start=1):

            c.execute(
                """
                UPDATE pipeline_stages
                SET position=?
                WHERE id=?
                """,
                (
                    index,
                    row["id"],
                ),
            )

    return {
        "ok": True
    }


@app.put("/api/pipelines/{pipeline_id}/stages/reorder")
def reorder_stages(
    pipeline_id: int,
    body: StageReorder,
    user=Depends(current_user)
):

    get_pipeline(
        pipeline_id,
        user["org_id"]
    )

    with db.conn() as c:

        existing = c.execute(
            """
            SELECT id
            FROM pipeline_stages
            WHERE pipeline_id=?
            ORDER BY id
            """,
            (
                pipeline_id,
            ),
        ).fetchall()

        existing_ids = {
            row["id"]
            for row in existing
        }

        incoming_ids = body.ordered_ids

        if (
            len(incoming_ids) != len(existing_ids)
            or set(incoming_ids) != existing_ids
        ):
            raise HTTPException(
                400,
                "The stage order does not match this pipeline."
            )

        for position, stage_id in enumerate(
            incoming_ids,
            start=1
        ):

            c.execute(
                """
                UPDATE pipeline_stages
                SET position=?
                WHERE id=? AND pipeline_id=?
                """,
                (
                    position,
                    stage_id,
                    pipeline_id,
                ),
            )

    return {
        "ok": True
    }


# ============================================================
# DEALS
# ============================================================

@app.get("/api/deals")
def list_deals(
    user=Depends(current_user)
):

    with db.conn() as c:

        rows = c.execute(
            """
            SELECT
                d.*,
                cu.name AS customer,
                p.name AS pipeline_name,
                ps.id AS stage_id,
                ps.position AS stage_position,
                ps.is_won AS stage_is_won,
                ps.is_lost AS stage_is_lost,
                (
                    SELECT COUNT(*)
                    FROM interactions i
                    WHERE i.deal_id=d.id
                ) AS n
            FROM deals d
            JOIN customers cu
                ON cu.id=d.customer_id
            LEFT JOIN pipelines p
                ON p.id=d.pipeline_id
            LEFT JOIN pipeline_stages ps
                ON ps.pipeline_id=d.pipeline_id
               AND ps.name=d.stage
            WHERE d.org_id=?
            ORDER BY d.id DESC
            """,
            (
                user["org_id"],
            ),
        ).fetchall()

    return [
        dict(r)
        for r in rows
    ]


@app.post("/api/customers/{customer_id}/deals")
def create_deal(
    customer_id: int,
    body: DealIn,
    user=Depends(current_user),
):

    get_customer(
        customer_id,
        user["org_id"]
    )

    if body.pipeline_id is None:
        pipeline = get_default_pipeline(
            user["org_id"]
        )
    else:
        pipeline = get_pipeline(
            body.pipeline_id,
            user["org_id"]
        )

    with db.conn() as c:

        if body.stage.strip():

            stage = c.execute(
                """
                SELECT *
                FROM pipeline_stages
                WHERE pipeline_id=?
                  AND lower(name)=lower(?)
                """,
                (
                    pipeline["id"],
                    body.stage.strip(),
                ),
            ).fetchone()

            if not stage:

                raise HTTPException(
                    400,
                    "Selected stage does not belong to the selected pipeline."
                )

            stage_name = stage["name"]

        else:

            first_stage = c.execute(
                """
                SELECT *
                FROM pipeline_stages
                WHERE pipeline_id=?
                ORDER BY position, id
                LIMIT 1
                """,
                (
                    pipeline["id"],
                ),
            ).fetchone()

            if not first_stage:

                raise HTTPException(
                    400,
                    "The selected pipeline has no stages."
                )

            stage_name = first_stage["name"]

        did = c.execute(
            """
            INSERT INTO deals(
                org_id,
                customer_id,
                pipeline_id,
                value,
                stage,
                product,
                created_at
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                user["org_id"],
                customer_id,
                pipeline["id"],
                body.value,
                stage_name,
                body.product,
                db.now(),
            ),
        ).lastrowid

    return get_deal(
        did,
        user["org_id"]
    )


@app.put("/api/deals/{deal_id}/stage")
def update_deal_stage(
    deal_id: int,
    body: DealStageUpdate,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    stage_name = body.stage.strip()

    if not stage_name:
        raise HTTPException(
            400,
            "Stage cannot be empty."
        )

    with db.conn() as c:

        stage = c.execute(
            """
            SELECT *
            FROM pipeline_stages
            WHERE pipeline_id=?
              AND lower(name)=lower(?)
            """,
            (
                deal["pipeline_id"],
                stage_name,
            ),
        ).fetchone()

        if not stage:

            raise HTTPException(
                400,
                "That stage does not belong to this deal's pipeline."
            )

        c.execute(
            """
            UPDATE deals
            SET stage=?
            WHERE id=?
              AND org_id=?
            """,
            (
                stage["name"],
                deal_id,
                user["org_id"],
            ),
        )

    return get_deal(
        deal_id,
        user["org_id"]
    )


@app.get("/api/deals/{deal_id}")
def deal_detail(
    deal_id: int,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    with db.conn() as c:

        interactions = [
            dict(r)
            for r in c.execute(
                """
                SELECT *
                FROM interactions
                WHERE deal_id=?
                ORDER BY date, id
                """,
                (deal_id,),
            ).fetchall()
        ]

        history = [
            dict(r)
            for r in c.execute(
                """
                SELECT *
                FROM history
                WHERE deal_id=?
                ORDER BY id
                """,
                (deal_id,),
            ).fetchall()
        ]

    return {
        "deal": deal,
        "interactions": interactions,
        "history": history,
    }


@app.delete("/api/deals/{deal_id}")
def delete_deal(
    deal_id: int,
    user=Depends(current_user),
):

    get_deal(
        deal_id,
        user["org_id"]
    )

    with db.conn() as c:

        c.execute(
            """
            DELETE FROM interactions
            WHERE deal_id=?
            """,
            (deal_id,),
        )

        c.execute(
            """
            DELETE FROM history
            WHERE deal_id=?
            """,
            (deal_id,),
        )

        c.execute(
            """
            DELETE FROM deals
            WHERE id=?
            """,
            (deal_id,),
        )

    return {
        "ok": True
    }


# ============================================================
# DEMO SEED
# ============================================================

@app.post("/api/deals/{deal_id}/demo/seed")
def seed(
    deal_id: int,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    with db.conn() as c:

        if c.execute(
            """
            SELECT 1
            FROM interactions
            WHERE deal_id=?
            """,
            (deal_id,),
        ).fetchone():

            return {
                "seeded": 0,
                "note": "This deal already has interactions.",
            }

        for item in demo_data.DEMO_INTERACTIONS:

            i = demo_data.render(
                item,
                deal["customer"]
            )

            retain(
                user["org_id"],
                deal["customer"],
                i,
            )

            c.execute(
                """
                INSERT INTO interactions(
                    deal_id,
                    date,
                    type,
                    title,
                    notes,
                    outcome,
                    created_at
                )
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    deal_id,
                    i["date"],
                    i["type"],
                    i["title"],
                    i["notes"],
                    i["outcome"],
                    db.now(),
                ),
            )

    return {
        "seeded": len(
            demo_data.DEMO_INTERACTIONS
        )
    }


@app.get("/api/deals/{deal_id}/demo/next")
def demo_next(
    deal_id: int,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    return demo_data.render(
        demo_data.DEMO_NEXT,
        deal["customer"],
    )


# ============================================================
# INTERACTIONS
# ============================================================

@app.post("/api/deals/{deal_id}/interactions")
def add_interaction(
    deal_id: int,
    body: Interaction,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    d = body.model_dump()

    d["date"] = (
        d["date"]
        or str(date.today())
    )

    retain(
        user["org_id"],
        deal["customer"],
        d,
    )

    with db.conn() as c:

        c.execute(
            """
            INSERT INTO interactions(
                deal_id,
                date,
                type,
                title,
                notes,
                outcome,
                created_at
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                deal_id,
                d["date"],
                d["type"],
                d["title"],
                d["notes"],
                d["outcome"],
                db.now(),
            ),
        )

    return d


# ============================================================
# AI SALES AGENT
# ============================================================

@app.post("/api/deals/{deal_id}/compare")
def compare(
    deal_id: int,
    q: Q,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    before, _ = answer(
        deal,
        user["org_id"],
        q.question,
        False,
    )

    after, mem = answer(
        deal,
        user["org_id"],
        q.question,
        True,
    )

    with db.conn() as c:

        n = c.execute(
            """
            SELECT COUNT(*) n
            FROM interactions
            WHERE deal_id=?
            """,
            (deal_id,),
        ).fetchone()["n"]

        c.execute(
            """
            INSERT INTO history(
                deal_id,
                question,
                answer,
                n_interactions,
                n_memories,
                created_at
            )
            VALUES(?,?,?,?,?,?)
            """,
            (
                deal_id,
                q.question,
                after,
                n,
                len(mem),
                db.now(),
            ),
        )

    return {
        "before": before,
        "after": after,
        "memories": mem,
    }


@app.post("/api/deals/{deal_id}/recall")
def recall_ep(
    deal_id: int,
    q: Q,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    return {
        "memories": recall(
            user["org_id"],
            (
                f"Customer: {deal['customer']}\n"
                f"Deal: {deal.get('product') or 'Unknown product'}\n"
                f"Stage: {deal.get('stage') or 'Unknown stage'}\n"
                f"Question: {q.question}"
            ),
        )
    }


@app.post("/api/deals/{deal_id}/reflect")
def reflect(
    deal_id: int,
    q: Q,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    ensure_bank(
        user["org_id"]
    )

    r = wrap(
        lambda: hs().reflect(
            bank_id=bank_id(
                user["org_id"]
            ),
            query=(
                f"{deal['customer']}: "
                f"{q.question}"
            ),
        )
    )

    return {
        "text": getattr(
            r,
            "text",
            str(r)
        )
    }


@app.post("/api/deals/{deal_id}/prep")
def prep(
    deal_id: int,
    user=Depends(current_user),
):

    deal = get_deal(
        deal_id,
        user["org_id"]
    )

    seen = set()
    mems = []

    for q in [
        "customer background and goals",
        "stakeholders and their concerns",
        "objections raised",
        "what worked and what failed",
        "commitments and next steps",
    ]:

        for m in recall(
            user["org_id"],
            f"{deal['customer']}: {q}",
        ):

            if m["text"] not in seen:

                seen.add(
                    m["text"]
                )

                mems.append(m)

    ctx = "\n".join(
        f"- {m['text']}"
        for m in mems
    ) or "(no memories)"

    out = llm(
        sys_prompt(deal)
        + (
            " Return JSON only with keys: "
            "customer_snapshot (string), "
            "pain_points (array), "
            'stakeholders (array of strings "Name - role - stance"), '
            "previous_objections (array), "
            "what_worked (array), "
            "what_failed (array), "
            "recommended_strategy (string), "
            "questions_to_ask (array), "
            "next_best_action (string). "
            "Use only the memories."
        ),
        f"Memories:\n{ctx}",
        js=True,
    )

    try:

        return {
            "prep": json.loads(out),
            "memories": mems,
        }

    except Exception:

        raise HTTPException(
            502,
            "The AI returned invalid JSON; please retry."
        )


# ============================================================
# WORKSPACE-WIDE MEMORY SEARCH
# ============================================================

@app.post("/api/memory/search")
def memory_search(
    q: Q,
    user=Depends(current_user),
):

    return {
        "memories": recall(
            user["org_id"],
            q.question,
        )
    }


# ============================================================
# INSIGHTS
# ============================================================

@app.get("/api/insights")
def insights(
    user=Depends(current_user)
):

    with db.conn() as c:

        n_customers = c.execute(
            """
            SELECT COUNT(*) n
            FROM customers
            WHERE org_id=?
            """,
            (user["org_id"],),
        ).fetchone()["n"]

        n_deals = c.execute(
            """
            SELECT COUNT(*) n
            FROM deals
            WHERE org_id=?
            """,
            (user["org_id"],),
        ).fetchone()["n"]

        deal_ids = [
            r["id"]
            for r in c.execute(
                """
                SELECT id
                FROM deals
                WHERE org_id=?
                """,
                (user["org_id"],),
            ).fetchall()
        ]

        stages = c.execute(
            """
            SELECT stage, COUNT(*) n
            FROM deals
            WHERE org_id=?
            GROUP BY stage
            """,
            (user["org_id"],),
        ).fetchall()

        interactions = []
        history = []

        if deal_ids:

            qm = ",".join(
                "?"
                * len(deal_ids)
            )

            interactions = c.execute(
                f"""
                SELECT *
                FROM interactions
                WHERE deal_id IN ({qm})
                """,
                deal_ids,
            ).fetchall()

            history = c.execute(
                f"""
                SELECT *
                FROM history
                WHERE deal_id IN ({qm})
                ORDER BY id
                """,
                deal_ids,
            ).fetchall()

    def sentiment(outcome):

        o = (
            outcome or ""
        ).lower()

        if "positive" in o:
            return "Positive"

        if "negative" in o:
            return "Negative"

        if "mixed" in o:
            return "Mixed"

        return "Neutral"

    sentiment_counts = Counter(
        sentiment(i["outcome"])
        for i in interactions
    )

    type_counts = Counter(
        i["type"]
        for i in interactions
    )

    by_date = defaultdict(int)

    for i in interactions:
        by_date[i["date"]] += 1

    activity = [
        {
            "date": k,
            "count": v,
        }
        for k, v in sorted(
            by_date.items()
        )
    ]

    avg_memories = (
        round(
            sum(
                h["n_memories"]
                for h in history
            )
            / len(history),
            1,
        )
        if history
        else 0
    )

    learning_curve = [
        {
            "run": idx + 1,
            "n_interactions": h["n_interactions"],
            "n_memories": h["n_memories"],
        }
        for idx, h in enumerate(history)
    ]

    return {
        "totals": {
            "customers": n_customers,
            "deals": n_deals,
            "interactions": len(
                interactions
            ),
            "agent_runs": len(
                history
            ),
            "avg_memories_per_run": avg_memories,
        },

        "stage_breakdown": [
            {
                "stage": r["stage"],
                "count": r["n"],
            }
            for r in stages
        ],

        "sentiment_breakdown": [
            {
                "sentiment": k,
                "count": v,
            }
            for k, v in sentiment_counts.items()
        ],

        "type_breakdown": [
            {
                "type": k,
                "count": v,
            }
            for k, v in type_counts.items()
        ],

        "activity_over_time": activity,

        "learning_curve": learning_curve,
    }


# ============================================================
# TEAM
# ============================================================

@app.get("/api/team")
def team(
    user=Depends(current_user)
):

    with db.conn() as c:

        org = c.execute(
            """
            SELECT *
            FROM orgs
            WHERE id=?
            """,
            (user["org_id"],),
        ).fetchone()

        members = c.execute(
            """
            SELECT
                id,
                name,
                email,
                created_at
            FROM users
            WHERE org_id=?
            ORDER BY id
            """,
            (user["org_id"],),
        ).fetchall()

    return {
        "org": {
            "id": org["id"],
            "name": org["name"],
            "slug": org["slug"],
        },

        "members": [
            dict(m)
            for m in members
        ],
    }
